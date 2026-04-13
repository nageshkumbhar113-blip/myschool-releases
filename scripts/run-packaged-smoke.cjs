const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')

const target = process.argv[2]
const SMOKE_WAIT_MS = 15000
const POLL_INTERVAL_MS = 500

const exeMap = {
  school: path.join(process.cwd(), 'release', 'school', 'win-unpacked', 'MY_School App.exe'),
  admin: path.join(process.cwd(), 'release', 'admin', 'win-unpacked', 'MY_School Admin Tool.exe'),
}

if (!exeMap[target]) {
  console.error('Usage: node scripts/run-packaged-smoke.cjs <school|admin>')
  process.exit(1)
}

const exePath = exeMap[target]
if (!fs.existsSync(exePath)) {
  console.error(`Packaged executable not found: ${exePath}`)
  process.exit(1)
}

const smokeDir = path.join(
  os.tmpdir(),
  target === 'admin' ? 'my_school_admin_smoke' : 'my_school_app_smoke',
)
const reportPath = path.join(
  smokeDir,
  target === 'admin' ? 'my-school-admin-smoke.json' : 'my-school-smoke.json',
)
const bootLogPath = path.join(
  smokeDir,
  target === 'admin' ? 'my-school-admin-boot.log' : 'my-school-boot.log',
)
fs.rmSync(smokeDir, { recursive: true, force: true })
fs.mkdirSync(smokeDir, { recursive: true })

const child = spawn(exePath, ['--smoke-test'], {
  cwd: path.dirname(exePath),
  stdio: 'ignore',
  env: {
    ...process.env,
    MY_SCHOOL_SMOKE_DIR: smokeDir,
    MY_SCHOOL_SMOKE_TEST: '1',
    MY_SCHOOL_SMOKE_REPORT: reportPath,
  },
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
child.unref()

const startedAt = Date.now()
const timer = setInterval(() => {
  if (!fs.existsSync(reportPath)) {
    if (Date.now() - startedAt < SMOKE_WAIT_MS) return
    clearInterval(timer)
    const bootLog = fs.existsSync(bootLogPath)
      ? fs.readFileSync(bootLogPath, 'utf8')
      : '(boot log missing)'
    console.error(`Smoke file not created: ${reportPath}`)
    console.error(`Boot log (${bootLogPath}):\n${bootLog}`)
    process.exit(1)
  }

  clearInterval(timer)
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))

  if (report?.status !== 'PASS') {
    const bootLog = fs.existsSync(bootLogPath)
      ? fs.readFileSync(bootLogPath, 'utf8')
      : '(boot log missing)'
    console.error(`Smoke failed (${target}): ${JSON.stringify(report)}`)
    console.error(`Boot log (${bootLogPath}):\n${bootLog}`)
    process.exit(1)
  }

  console.log(`Smoke passed (${target}): ${JSON.stringify(report)}`)
  process.exit(0)
}, POLL_INTERVAL_MS)
