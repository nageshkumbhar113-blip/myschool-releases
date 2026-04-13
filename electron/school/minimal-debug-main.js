import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { app, BrowserWindow } from 'electron'

const debugLog = path.join(os.tmpdir(), 'app-debug.log')

function log(message) {
  try {
    fs.appendFileSync(debugLog, `[${new Date().toISOString()}] ${message}\n`, 'utf8')
  } catch {}
}

log('MINIMAL MAIN JS LOADED')

app.whenReady().then(() => {
  log('MINIMAL WINDOW READY')
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
  })
  win.loadURL('data:text/html,<h1>Minimal Debug Window</h1>').catch((error) => {
    log(`MINIMAL LOAD ERROR: ${error?.message || error}`)
  })

  setTimeout(() => {
    log('MINIMAL QUIT')
    app.quit()
  }, 1500)
}).catch((error) => {
  log(`MINIMAL STARTUP ERROR: ${error?.stack || error?.message || error}`)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
