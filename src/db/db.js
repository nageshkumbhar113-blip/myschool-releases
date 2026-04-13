import Dexie from 'dexie'

export const db = new Dexie('MySchoolDB')

// Version 1 — initial schema
db.version(1).stores({
  institutes:
    'id, name, createdAt, updatedAt, deletedAt',

  fields:
    'id, instituteId, key, order, createdAt, updatedAt',

  templates:
    'id, instituteId, name, type, isLocked, createdAt, updatedAt',

  students:
    'id, instituteId, status, academicYear, createdAt, updatedAt, deletedAt, [instituteId+status], [instituteId+academicYear]',

  fees:
    'id, studentId, instituteId, createdAt, [studentId], [instituteId]',

  receipts:
    'id, studentId, instituteId, receiptNumber, createdAt, [studentId]',

  counters:
    'id, instituteId, key, [instituteId+key]',

  audit_logs:
    'id, instituteId, tableName, recordId, timestamp, [instituteId+tableName]',
})

// Version 2 — add settings table (school header/footer data)
db.version(2).stores({
  settings: 'id, instituteId',
})

// Version 3 — add license_data table (single record: id = 'current')
db.version(3).stores({
  license_data: 'id',
})

// Boot — log confirmation once DB opens
db.on('ready', () => {
  console.log('%c✅ DB Ready', 'color: #22c55e; font-weight: bold; font-size: 13px;')
})

// Version 4 — add status + cancelReason to receipts
db.version(4).stores({
  receipts:
    'id, studentId, instituteId, receiptNumber, status, createdAt, [studentId]',
})

// Version 5 — add documents table
db.version(5).stores({
  documents: 'id, studentId, instituteId, fileType, createdAt, [instituteId+studentId]',
})

// Version 6 — super admin auth data (IndexedDB, now migrated to SQLite in v7)
db.version(6).stores({
  super_admin_config: 'id, updatedAt',
  super_admin_sessions: 'id, tokenHash, deviceHash, expiresAt, createdAt',
})

// Version 7 — drop auth tables (auth moved to SQLite/main-process)
db.version(7).stores({
  super_admin_config: null,
  super_admin_sessions: null,
})

// Version 8 — school-level password auth (single record: id = 'config')
db.version(8).stores({
  school_auth: 'id, createdAt',
})

export default db
