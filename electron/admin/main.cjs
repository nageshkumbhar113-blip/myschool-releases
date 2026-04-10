const fs = require('fs')
const path = require('path')
const http = require('http')
const os = require('os')
const crypto = require('crypto')
const dns = require('dns').promises
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const { getDb, closeDb } = require('../school/sqlite.cjs')
const { registerAuthHandlers } = require('../school/auth-handlers.cjs')
const { registerSchoolMetaHandlers } = require('../school/meta-handlers.cjs')

const WINDOW_TITLE = 'MY_School Admin Tool'
const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 1024
const MIN_HEIGHT = 600
const ADMIN_ROUTE = '/super-admin/login'
const isDev = !app.isPackaged
const isSmokeTest = process.argv.includes('--smoke-test')
const smokeExit = () => setTimeout(() => {
  console.error('MY_School Admin Tool smoke test timed out.')
  process.exitCode = 1
  app.exit(1)
}, 15000)

if (isSmokeTest) {
  const smokeDataDir = path.join(os.tmpdir(), 'my_school_admin_smoke')
  fs.mkdirSync(smokeDataDir, { recursive: true })
  app.setPath('userData', smokeDataDir)
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-http-cache')
}

let mainWindow = null
let staticServer = null
let baseUrl = ''

function resolveAppPath(...segments) {
  return path.join(__dirname, '../..', ...segments)
}

function getRuntimeIcon() {
  return resolveAppPath('assets', 'admin-icon.ico')
}

function getLicenseFilePath() {
  return path.join(app.getPath('userData'), 'license.json')
}

function formatShortId(hash) {
  return String(hash || '')
    .slice(0, 16)
    .toUpperCase()
    .match(/.{1,4}/g)
    ?.join('-') || 'UNKNOWN-DEVICE'
}

function getNativeDeviceInfo() {
  const macs = Object.values(os.networkInterfaces())
    .flat()
    .filter(Boolean)
    .filter(item => !item.internal && item.mac && item.mac !== '00:00:00:00:00:00')
    .map(item => item.mac.toLowerCase())
    .sort()

  // NOTE: os.release() intentionally excluded — Windows Updates change it
  // and would invalidate existing licenses on the same machine.
  const fingerprintSource = JSON.stringify({
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpu: os.cpus()?.[0]?.model || 'unknown-cpu',
    macs,
  })

  const hash = crypto.createHash('sha256').update(fingerprintSource).digest('hex')

  return {
    hash,
    shortId: formatShortId(hash),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
  }
}

function readLicenseFile() {
  try {
    const filePath = getLicenseFilePath()
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function saveLicenseFile(data) {
  const filePath = getLicenseFilePath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  if (!data) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return null
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  return data
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.html') return 'text/html; charset=utf-8'
  if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8'
  if (ext === '.css') return 'text/css; charset=utf-8'
  if (ext === '.json') return 'application/json; charset=utf-8'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.png') return 'image/png'
  if (ext === '.ico') return 'image/x-icon'
  if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8'
  return 'application/octet-stream'
}

function serveFile(res, filePath, statusCode = 200) {
  try {
    const content = fs.readFileSync(filePath)
    res.writeHead(statusCode, { 'Content-Type': getMimeType(filePath), 'Cache-Control': 'no-cache' })
    res.end(content)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
  }
}

function ensureBuiltAppExists(distRoot) {
  const indexFile = path.join(distRoot, 'index.html')
  if (!fs.existsSync(indexFile)) {
    throw new Error(`Missing built React app at ${indexFile}. Run "npm run build" first.`)
  }
  return indexFile
}

function resolveDistRequestPath(distRoot, pathname) {
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  const candidates = [relativePath]
  const assetsIndex = relativePath.indexOf('assets/')
  const basename = path.basename(relativePath)

  if (assetsIndex !== -1) candidates.push(relativePath.slice(assetsIndex))
  if (basename && basename !== relativePath) candidates.push(basename)

  for (const candidate of candidates) {
    const candidatePath = path.normalize(path.join(distRoot, candidate))
    if (candidatePath.startsWith(distRoot) && fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath
    }
  }

  return null
}

function startStaticServer() {
  const distRoot = resolveAppPath('dist')
  const indexFile = ensureBuiltAppExists(distRoot)

  if (staticServer && baseUrl) return Promise.resolve(baseUrl)

  return new Promise((resolve, reject) => {
    staticServer = http.createServer((req, res) => {
      try {
        const requestUrl = new URL(req.url, 'http://127.0.0.1')
        const pathname = decodeURIComponent(requestUrl.pathname)
        const assetPath = resolveDistRequestPath(distRoot, pathname)

        if (assetPath) return serveFile(res, assetPath)
        return serveFile(res, indexFile)
      } catch {
        return serveFile(res, indexFile)
      }
    })

    staticServer.once('error', reject)
    staticServer.listen(0, '127.0.0.1', () => {
      const { port } = staticServer.address()
      baseUrl = `http://127.0.0.1:${port}`
      resolve(baseUrl)
    })
  })
}

function stopStaticServer() {
  if (staticServer) {
    staticServer.close()
    staticServer = null
    baseUrl = ''
  }
}

async function checkInternet() {
  try {
    await dns.lookup('github.com')
    return true
  } catch {
    return false
  }
}

function lockDownWindow(win) {
  if (isDev) return

  Menu.setApplicationMenu(null)
  win.webContents.on('devtools-opened', () => {
    win.webContents.closeDevTools()
  })
  win.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key || '').toUpperCase()
    const blocked = key === 'F12'
      || ((input.control || input.meta) && input.shift && ['I', 'J', 'C'].includes(key))
    if (blocked) event.preventDefault()
  })
}

function verifyAdminScreen(win) {
  return win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const startedAt = Date.now()
      const expectedPath = ${JSON.stringify(ADMIN_ROUTE)}
      const check = () => {
        const text = document.body.innerText || ''
        const onExpectedRoute = window.location.pathname === expectedPath
        const hasExpectedUi = text.includes('Admin Login')
          || text.includes('Create Admin Password')
          || text.includes('Loading admin security...')
          || text.includes('Sign In to Admin Panel')
          || text.includes('Save Admin Password')

        if ((onExpectedRoute && hasExpectedUi) || Date.now() - startedAt > 10000) {
          resolve({ onExpectedRoute, hasExpectedUi, pathname: window.location.pathname, text })
          return
        }

        setTimeout(check, 100)
      }

      check()
    })
  `)
}

async function createWindow() {
  await startStaticServer()

  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: WINDOW_TITLE,
    icon: getRuntimeIcon(),
    show: !isSmokeTest,
    paintWhenInitiallyHidden: true,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      sandbox: false,
      devTools: isDev,
    },
  })

  lockDownWindow(mainWindow)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isSmokeTest) {
    mainWindow.webContents.on('console-message', (_event, level, message) => {
      console.log(`[admin-console:${level}] ${message}`)
    })
    mainWindow.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
      console.error(`Admin did-fail-load: ${code} ${description} ${validatedURL}`)
    })
  }

  await mainWindow.loadURL(`${baseUrl}${ADMIN_ROUTE}`)

  if (isSmokeTest) {
    const result = await verifyAdminScreen(mainWindow)
    if (!result?.onExpectedRoute || !result?.hasExpectedUi) {
      throw new Error(`Admin React UI did not reach ${ADMIN_ROUTE}. Current path: ${result?.pathname || 'unknown'}. Page text: ${(result?.text || '').slice(0, 200)}`)
    }
    console.log('MY_School Admin Tool Electron smoke test passed.')
    setTimeout(() => app.quit(), 1200)
    return
  }

  mainWindow.show()
}

ipcMain.handle('read-license', async () => readLicenseFile())
ipcMain.handle('save-license', async (_event, data) => saveLicenseFile(data))
ipcMain.handle('get-device-id', async () => getNativeDeviceInfo())
ipcMain.handle('get-version', async () => app.getVersion())
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) return { ok: false, reason: 'not-packaged' }
  if (!await checkInternet()) return { ok: false, reason: 'offline' }
  return { ok: false, reason: 'not-configured' }
})
ipcMain.handle('install-update', async () => ({ ok: false, reason: 'not-configured' }))
ipcMain.on('download-update', () => {})

app.whenReady().then(async () => {
  if (isSmokeTest) smokeExit()
  getDb()
  registerAuthHandlers()
  registerSchoolMetaHandlers()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
}).catch((error) => {
  console.error('Failed to start MY_School Admin Tool:', error)
  process.exitCode = 1
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  closeDb()
  stopStaticServer()
})

