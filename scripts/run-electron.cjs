const { spawn } = require('child_process')
const path = require('path')

const electronBinary = require('electron')
const target = process.argv[2]
const smoke = process.argv.includes('--smoke-test')

const entryMap = {
  school: path.join(process.cwd(), 'electron', 'school', 'main.cjs'),
  admin: path.join(process.cwd(), 'electron', 'admin', 'main.cjs'),
}

if (!entryMap[target]) {
  console.error('Usage: node scripts/run-electron.cjs <school|admin> [--smoke-test]')
  process.exit(1)
}

const child = spawn(electronBinary, [entryMap[target], ...(smoke ? ['--smoke-test'] : [])], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    ELECTRON_RUN_AS_NODE: undefined,
  },
})

child.on('exit', (code) => process.exit(code ?? 0))
child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
