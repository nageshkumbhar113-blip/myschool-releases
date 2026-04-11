const fs = require('fs')
const path = require('path')
const http = require('http')
const os = require('os')
const BOOT_LOG = path.join(os.tmpdir(), 'my-school-boot.log')

function bootLog(message) {
  try {
    fs.appendFileSync(BOOT_LOG, `[${new Date().toISOString()}] ${message}\n`, 'utf8')
  } catch {}
}

bootLog('App start (main.cjs loaded)')

process.on('uncaughtException', (error) => {
  bootLog(`uncaughtException: ${error?.stack || error?.message || error}`)
})

process.on('unhandledRejection', (error) => {
  bootLog(`unhandledRejection: ${error?.stack || error?.message || error}`)
})
const crypto = require('crypto')
const dns = require('dns').promises
const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const { getDb, closeDb } = require('./sqlite.cjs')
const { registerSchoolDataHandlers } = require('./data-handlers.cjs')
const { registerSchoolMetaHandlers } = require('./meta-handlers.cjs')
const { registerAuthHandlers } = require('./auth-handlers.cjs')

const WINDOW_TITLE = 'MY_School App'
const DEFAULT_WIDTH = 1280
const DEFAULT_HEIGHT = 800
const MIN_WIDTH = 1024
const MIN_HEIGHT = 600
const SMOKE_TIMEOUT = 10000
const isDev = !app.isPackaged
const isSmokeTest = process.argv.includes('--smoke-test') || process.env.MY_SCHOOL_SMOKE_TEST === '1'
let smokeReported = false

function getSmokeReportPath() {
  return process.env.MY_SCHOOL_SMOKE_REPORT
    || path.join(app.getPath('temp'), 'my-school-smoke.json')
}

function writeSmokeReport(report) {
  if (!isSmokeTest) return
  const filePath = getSmokeReportPath()
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, JSON.stringify({
    ...report,
    timestamp: new Date().toISOString(),
  }, null, 2), 'utf8')
}

const smokeExit = () => setTimeout(() => {
  logFail('Timeout', { app: 'school' })
  process.exitCode = 1
  app.exit(1)
}, SMOKE_TIMEOUT)

function logPass(data = {}) {
  const payload = {
    status: 'PASS',
    type: 'SMOKE_TEST',
    timestamp: new Date().toISOString(),
    ...data,
  }
  if (!smokeReported) {
    smokeReported = true
    writeSmokeReport(payload)
    console.log(JSON.stringify(payload))
  }
  return payload
}

function logFail(error, data = {}) {
  const payload = {
    status: 'FAIL',
    type: 'SMOKE_TEST',
    timestamp: new Date().toISOString(),
    error: error?.message || error,
    ...data,
  }
  if (!smokeReported) {
    smokeReported = true
    writeSmokeReport(payload)
    console.error(JSON.stringify(payload))
  }
  return payload
}

if (isSmokeTest) {
  bootLog('Smoke mode detected')
  const smokeDataDir = path.join(os.tmpdir(), 'my_school_app_smoke')
  fs.mkdirSync(smokeDataDir, { recursive: true })
  app.setPath('userData', smokeDataDir)
  app.commandLine.appendSwitch('disable-gpu')
  app.commandLine.appendSwitch('disable-http-cache')
}

let mainWindow = null
let staticServer = null
let baseUrl = ''

function resolveAppPath(...segments) {
  const appRoot = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar')
    : path.join(__dirname, '../..')
  return path.join(appRoot, ...segments)
}

function getRuntimeIcon() {
  return resolveAppPath('assets', 'school-icon.ico')
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
  bootLog('startStaticServer start')
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
      bootLog(`startStaticServer listening on ${baseUrl}`)
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

function attachSmokeLogging(win, label) {
  if (!isSmokeTest) return

  win.webContents.on('console-message', (_event, level, message) => {
    bootLog(`${label} console-message [${level}]: ${message}`)
    console.log(`[${label}-console:${level}] ${message}`)
  })
  win.webContents.on('did-fail-load', (_event, code, description, validatedURL) => {
    bootLog(`${label} did-fail-load: ${code} ${description} ${validatedURL}`)
    console.error(`${label} did-fail-load: ${code} ${description} ${validatedURL}`)
  })
}

function verifySchoolRuntime(win) {
  bootLog('runSmokeTest START')
  return win.webContents.executeJavaScript(`
    new Promise((resolve) => {
      const startedAt = Date.now()
      let lastError = ''

      const snapshot = (extra = {}) => ({
        hasElectronApi: Boolean(window.electronAPI),
        hasSchoolApi: Boolean(window.schoolApi),
        pathname: window.location.pathname,
        title: document.title,
        pageText: (document.body?.innerText || '').slice(0, 200),
        ...extra,
      })

      const check = async () => {
        try {
          const electronAPI = window.electronAPI ?? null
          const schoolApi = window.schoolApi ?? null
          const version = typeof electronAPI?.getVersion === 'function'
            ? await electronAPI.getVersion()
            : null
          const dbInfo = typeof schoolApi?.diagnostics?.getDbInfo === 'function'
            ? await schoolApi.diagnostics.getDbInfo()
            : null
          const licenseRecord = typeof schoolApi?.license?.getCurrent === 'function'
            ? await schoolApi.license.getCurrent()
            : undefined

          if (electronAPI && schoolApi && typeof version === 'string' && version && dbInfo?.path) {
            resolve(snapshot({
              ok: true,
              version,
              dbPath: dbInfo.path,
              licenseBridgeReachable: licenseRecord === null || typeof licenseRecord === 'object',
            }))
            return
          }
        } catch (error) {
          lastError = error?.message || String(error)
        }

        if (Date.now() - startedAt > 10000) {
          resolve(snapshot({ ok: false, lastError }))
          return
        }

        setTimeout(check, 100)
      }

      check()
    })
  `)
}

function sendUpdateEvent(channel, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents.send(channel, payload)
}

async function checkInternet() {
  try {
    await dns.lookup('github.com')
    return true
  } catch {
    return false
  }
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.on('update-available', (info) => sendUpdateEvent('update-available', info))
  autoUpdater.on('update-not-available', () => sendUpdateEvent('update-not-available', null))
  autoUpdater.on('update-downloaded', (info) => sendUpdateEvent('update-downloaded', info))
  autoUpdater.on('download-progress', (progress) => sendUpdateEvent('download-progress', progress))
  autoUpdater.on('error', (err) => sendUpdateEvent('update-error', err?.message ?? 'Update failed'))
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

async function createWindow() {
  bootLog('createWindow start')
  await startStaticServer()

  mainWindow = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    title: WINDOW_TITLE,
    icon: getRuntimeIcon(),
    show: !isSmokeTest,
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
  bootLog('BrowserWindow created')

  lockDownWindow(mainWindow)
  attachSmokeLogging(mainWindow, 'school')

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    bootLog('did-finish-load fired')
    mainWindow.webContents.executeJavaScript("console.log('App loaded successfully')").catch(() => {})
  })

  let smokeRan = false
  let smokeTimer = null
  let resolveSmoke
  let rejectSmoke
  const smokeDone = isSmokeTest
    ? new Promise((resolve, reject) => {
      resolveSmoke = resolve
      rejectSmoke = reject
    })
    : null

  function safeRunSmoke() {
    if (!isSmokeTest || smokeRan) return
    smokeRan = true
    bootLog('safeRunSmoke invoked')

    verifySchoolRuntime(mainWindow).then((result) => {
      if (!result?.ok) {
        throw new Error(`School smoke test failed: ${JSON.stringify(result)}`)
      }

      clearTimeout(smokeTimer)
      const payload = logPass({
        app: 'school',
        version: result.version,
        dbPath: result.dbPath,
        hasElectronApi: result.hasElectronApi,
        hasSchoolApi: result.hasSchoolApi,
        licenseBridgeReachable: result.licenseBridgeReachable,
      })
      bootLog(`smoke PASS: ${JSON.stringify(payload)}`)
      setTimeout(() => app.quit(), 1200)
      resolveSmoke?.(payload)
    }).catch((error) => {
      clearTimeout(smokeTimer)
      const payload = logFail(error, { app: 'school' })
      bootLog(`smoke FAIL: ${JSON.stringify(payload)}`)
      process.exitCode = 1
      app.exit(1)
      rejectSmoke?.(payload)
    })
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (isSmokeTest) {
      safeRunSmoke()
      return
    }
    // Delay update check so React components (UpdateNotification) are fully mounted
    if (app.isPackaged) {
      setTimeout(async () => {
        try {
          if (await checkInternet()) {
            autoUpdater.checkForUpdates().catch(() => {})
          }
        } catch {}
      }, 4000)
    }
  })

  if (isSmokeTest) {
    smokeTimer = smokeExit()
  }

  await mainWindow.loadURL(baseUrl)
  bootLog(`loadURL complete: ${baseUrl}`)

  if (isSmokeTest) {
    await smokeDone
    return
  }

  // Update check is handled in did-finish-load with a delay
}

ipcMain.handle('read-license', async () => readLicenseFile())
ipcMain.handle('save-license', async (_event, data) => saveLicenseFile(data))
ipcMain.handle('get-device-id', async () => getNativeDeviceInfo())
ipcMain.handle('get-version', async () => app.getVersion())
ipcMain.handle('check-for-updates', async () => {
  if (!app.isPackaged) return { ok: false, reason: 'not-packaged' }
  if (!await checkInternet()) return { ok: false, reason: 'offline' }
  autoUpdater.checkForUpdates().catch(() => {})
  return { ok: true }
})
ipcMain.handle('install-update', async () => {
  autoUpdater.quitAndInstall(false, true)
  return { ok: true }
})
ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch(() => {})
})


app.whenReady().then(async () => {
  bootLog('app.whenReady')
  if (isSmokeTest) smokeExit()
  setupAutoUpdater()
  getDb()
  registerSchoolDataHandlers()
  registerSchoolMetaHandlers()
  registerAuthHandlers()
  await createWindow()

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow()
    }
  })
}).catch((error) => {
  bootLog(`startup catch: ${error?.stack || error?.message || error}`)
  if (isSmokeTest) logFail(error, { app: 'school' })
  console.error('Failed to start MY_School App Electron shell:', error)
  process.exitCode = 1
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  bootLog('before-quit')
  closeDb()
  stopStaticServer()
})
