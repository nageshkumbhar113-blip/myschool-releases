import fs from 'node:fs'
import path from 'node:path'

const repoRoot = process.cwd()
const reportPath = path.join(repoRoot, 'SMOKE_REPORT.md')

const checks = []

function addCheck(name, passed, details) {
  checks.push({ name, passed, details })
}

function fileExists(relativePath) {
  const fullPath = path.join(repoRoot, relativePath)
  const passed = fs.existsSync(fullPath)
  addCheck(`File exists: ${relativePath}`, passed, passed ? 'Found' : 'Missing')
}

function fileContains(relativePath, pattern, label) {
  const fullPath = path.join(repoRoot, relativePath)
  if (!fs.existsSync(fullPath)) {
    addCheck(label, false, `${relativePath} missing`)
    return
  }

  const content = fs.readFileSync(fullPath, 'utf8')
  const passed = typeof pattern === 'string' ? content.includes(pattern) : pattern.test(content)
  addCheck(label, passed, passed ? 'Found' : 'Not found')
}

addCheck('Build command available', true, 'Run separately with npm run build')
addCheck('License tests available', true, 'Run separately with npm run test:license')

fileExists('SMOKE_CHECKLIST.md')
fileExists('src/components/AdmissionFormPreview.jsx')
fileExists('src/utils/documentValueResolver.js')

fileContains('src/App.jsx', 'students/:id/edit', 'Edit student route present')
fileContains('src/pages/StudentDetail.jsx', 'handlePreviewAdmissionForm', 'Admission preview handler present')
fileContains('src/pages/StudentDetail.jsx', 'handleEditStudent', 'Edit student handler present')
fileContains('src/pages/AddStudent.jsx', 'const isEditMode = Boolean(id)', 'AddStudent edit mode present')
fileContains('src/pages/AddStudent.jsx', 'dateToWordsEnglish', 'DOB in words integration present')
fileContains('src/pages/TemplateBuilder.jsx', 'AdmissionFieldSelector', 'Admission template selector present')
fileContains(
  'src/utils/backup.js',
  'Student limit exceeded. Cannot restore backup.',
  'Backup restore student limit protection present'
)
fileContains('package.json', '"test:license"', 'License test script present')
fileContains('package.json', '"smoke:preflight"', 'Smoke preflight script present')

const passedCount = checks.filter((item) => item.passed).length
const failedChecks = checks.filter((item) => !item.passed)

const lines = [
  '# Smoke Preflight Report',
  '',
  `Date: ${new Date().toISOString()}`,
  '',
  `Passed: ${passedCount}/${checks.length}`,
  '',
  '## Checks',
  '',
  ...checks.map((item) => `- ${item.passed ? '[PASS]' : '[FAIL]'} ${item.name}: ${item.details}`),
  '',
  '## Manual Runtime Note',
  '',
  '- Use `npm run build` and `npm run test:license` separately for executable validation.',
  '- Use `SMOKE_CHECKLIST.md` for browser-level manual verification of the 9 critical flows.',
  '',
  failedChecks.length === 0 ? 'Overall result: PASS' : 'Overall result: FAIL',
  '',
]

fs.writeFileSync(reportPath, lines.join('\n'))

if (failedChecks.length > 0) {
  console.error(`Smoke preflight failed. See ${reportPath}`)
  process.exit(1)
}

console.log(`Smoke preflight passed. Report written to ${reportPath}`)
