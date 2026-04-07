import { getInstituteLicenseLimit } from './licenseLimits'
import schoolDataService from '../services/schoolDataService'

export const BACKUP_VERSION = '1.0'
export const SUPPORTED_VERSIONS = ['1.0']

const TABLES = ['institutes', 'fields', 'templates', 'students', 'fees', 'receipts', 'counters', 'settings', 'audit_logs', 'documents']

export async function exportBackup(instituteId = null, instituteName = '') {
  const { payload, counts } = await schoolDataService.backup.exportData({ instituteId, instituteName })

  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const dateStr = new Date().toISOString().slice(0, 10)
  const anchor = Object.assign(document.createElement('a'), {
    href: url,
    download: `myschool-backup-${dateStr}.json`,
  })
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 15000)
  return { payload, counts }
}

export async function validateBackupFile(file) {
  const errors = []
  const warnings = []

  let raw
  try {
    raw = await file.text()
  } catch {
    return { ok: false, errors: ['Could not read file.'] }
  }

  let backup
  try {
    backup = JSON.parse(raw)
  } catch {
    return { ok: false, errors: ['File is not valid JSON.'] }
  }

  if (!backup || typeof backup !== 'object') {
    errors.push('Backup root must be a JSON object.')
  } else {
    if (!backup.version) errors.push('Missing "version" field.')
    if (!backup.exportedAt) errors.push('Missing "exportedAt" field.')
    if (!backup.data || typeof backup.data !== 'object') errors.push('Missing or invalid "data" field.')
    if (backup.version && !SUPPORTED_VERSIONS.includes(String(backup.version))) {
      errors.push(`Unsupported backup version: ${backup.version}. Supported: ${SUPPORTED_VERSIONS.join(', ')}.`)
    }

    const currentId = localStorage.getItem('currentInstituteId')
    if (currentId && backup.instituteId && backup.instituteId !== currentId) {
      warnings.push(`This backup is from "${backup.instituteName || backup.instituteId}". Importing will add/overwrite its data into the current school.`)
    }
  }

  if (errors.length) return { ok: false, errors, warnings }

  const requiredTables = ['institutes', 'students', 'fees']
  for (const table of requiredTables) {
    if (!Array.isArray(backup.data[table])) {
      errors.push(`Required table "${table}" is missing or not an array.`)
    }
  }

  for (const [table, rows] of Object.entries(backup.data)) {
    if (!Array.isArray(rows)) {
      warnings.push(`Table "${table}" is not an array and will be skipped.`)
      continue
    }
    if (rows.length > 0 && !rows[0].id) {
      warnings.push(`Records in "${table}" may be missing "id" field.`)
    }
  }

  if (errors.length) return { ok: false, errors, warnings }

  const counts = {}
  for (const [key, value] of Object.entries(backup.data)) {
    counts[key] = Array.isArray(value) ? value.length : 0
  }

  return { ok: true, backup, counts, errors: [], warnings }
}

export async function applyRestore(backup) {
  const targetInstituteId = backup.instituteId ?? localStorage.getItem('currentInstituteId') ?? null
  const incomingStudents = Array.isArray(backup.data?.students)
    ? backup.data.students.filter((student) => !student.deletedAt && (!targetInstituteId || student.instituteId === targetInstituteId))
    : []

  if (targetInstituteId && incomingStudents.length > 0) {
    const [existingStudents, limitInfo] = await Promise.all([
      schoolDataService.students.list(targetInstituteId),
      getInstituteLicenseLimit(targetInstituteId),
    ])
    const maxStudents = limitInfo?.maxStudents ?? null
    if (maxStudents !== null) {
      const existingIds = new Set(existingStudents.map((student) => student.id))
      const incomingNewCount = incomingStudents.filter((student) => !existingIds.has(student.id)).length
      if (existingStudents.length + incomingNewCount > maxStudents) {
        throw new Error('Student limit exceeded. Cannot restore backup.')
      }
    }
  }

  const written = await schoolDataService.backup.apply(backup)
  return written
}

export async function getCurrentCounts() {
  return schoolDataService.backup.getCounts()
}

export const TABLE_LABELS = {
  institutes: 'Institutes',
  fields: 'Form Fields',
  templates: 'Templates',
  students: 'Students',
  fees: 'Fee Records',
  receipts: 'Receipts',
  counters: 'Counters',
  settings: 'School Settings',
  audit_logs: 'Audit Logs',
  documents: 'Documents',
}

