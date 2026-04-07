/**
 * helpers.js
 *
 * High-level database helpers used throughout the app.
 * All writes go through these functions so that:
 *   - UUIDs are always generated via crypto.randomUUID()
 *   - Timestamps are always ISO-8601 strings
 *   - Soft-deletes are never hard-deletes
 *   - Every mutating operation emits an audit log entry
 *
 * Receipt numbering is handled exclusively by utils/receiptNumber.js
 * Format: {CODE}-{YYYY}-{NNNN}  e.g. SPS-2025-0001
 */

import db from './db'
import { runMigrations } from './migrations'
import { getNextReceiptNumber } from '../utils/receiptNumber'

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Generate a new UUID (browser-native, no library needed) */
export const newId = () => crypto.randomUUID()

/** Current timestamp as ISO-8601 string */
export const nowISO = () => new Date().toISOString()

// ---------------------------------------------------------------------------
// App initialisation
// ---------------------------------------------------------------------------

let _initialised = false

/**
 * Call once at app startup (e.g. in main.jsx or App.jsx).
 * Opens the database and runs any pending migrations.
 */
export async function initDB() {
  if (_initialised) return
  await db.open()
  await runMigrations()
  _initialised = true
}

// ---------------------------------------------------------------------------
// Generic CRUD helpers
// ---------------------------------------------------------------------------

/**
 * Get a single record by primary key.
 * Returns undefined when not found or when the record is soft-deleted.
 */
export async function getById(table, id, includeSoftDeleted = false) {
  const record = await table.get(id)
  if (!record) return undefined
  if (!includeSoftDeleted && record.deletedAt) return undefined
  return record
}

/**
 * Get all non-deleted records from a table, optionally filtered.
 */
export async function getAll(table, filterFn) {
  const records = await table
    .filter(r => !r.deletedAt)
    .toArray()
  return filterFn ? records.filter(filterFn) : records
}

/**
 * Add a new record. Automatically assigns id, createdAt, updatedAt.
 * Emits an audit log entry.
 */
export async function addRecord(table, tableName, data, instituteId = null) {
  const record = {
    ...data,
    id: newId(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  }
  await table.add(record)
  await auditLog({
    instituteId: instituteId ?? data.instituteId ?? null,
    action: 'CREATE',
    tableName,
    recordId: record.id,
    before: null,
    after: record,
  })
  return record
}

/**
 * Update an existing record by id. Automatically bumps updatedAt.
 * Emits an audit log entry showing before/after.
 */
export async function updateRecord(table, tableName, id, changes, instituteId = null) {
  const before = await table.get(id)
  if (!before) throw new Error(`${tableName} record ${id} not found`)

  const patch = { ...changes, updatedAt: nowISO() }
  await table.update(id, patch)

  const after = { ...before, ...patch }
  await auditLog({
    instituteId: instituteId ?? before.instituteId ?? null,
    action: 'UPDATE',
    tableName,
    recordId: id,
    before,
    after,
  })
  return after
}

/**
 * Soft-delete a record by setting deletedAt. Never removes from IndexedDB.
 * Emits an audit log entry.
 */
export async function softDelete(table, tableName, id, instituteId = null) {
  const before = await table.get(id)
  if (!before) throw new Error(`${tableName} record ${id} not found`)
  if (before.deletedAt) return before // already deleted — idempotent

  const patch = { deletedAt: nowISO(), updatedAt: nowISO() }
  await table.update(id, patch)

  const after = { ...before, ...patch }
  await auditLog({
    instituteId: instituteId ?? before.instituteId ?? null,
    action: 'DELETE',
    tableName,
    recordId: id,
    before,
    after,
  })
  return after
}

/**
 * Restore a soft-deleted record (sets deletedAt back to null).
 */
export async function restore(table, tableName, id) {
  const before = await table.get(id)
  if (!before) throw new Error(`${tableName} record ${id} not found`)

  const patch = { deletedAt: null, updatedAt: nowISO() }
  await table.update(id, patch)

  const after = { ...before, ...patch }
  await auditLog({
    instituteId: before.instituteId ?? null,
    action: 'RESTORE',
    tableName,
    recordId: id,
    before,
    after,
  })
  return after
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

/**
 * Append an entry to the audit_logs table.
 */
export async function auditLog({ instituteId, action, tableName, recordId, before, after }) {
  await db.audit_logs.add({
    id: newId(),
    instituteId: instituteId ?? null,
    action,
    tableName,
    recordId,
    before: before ? JSON.parse(JSON.stringify(before)) : null,
    after: after ? JSON.parse(JSON.stringify(after)) : null,
    timestamp: nowISO(),
  })
}

/**
 * Retrieve the full audit history for a specific record.
 */
export async function getAuditHistory(tableName, recordId) {
  const logs = await db.audit_logs
    .filter(l => l.tableName === tableName && l.recordId === recordId)
    .toArray()
  return logs.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
}

// ---------------------------------------------------------------------------
// Convenience table wrappers
// ---------------------------------------------------------------------------

export const Institutes = {
  add: (data) => addRecord(db.institutes, 'institutes', data),
  update: (id, changes) => updateRecord(db.institutes, 'institutes', id, changes),
  delete: (id) => softDelete(db.institutes, 'institutes', id),
  getById: (id) => getById(db.institutes, id),
  getAll: (filter) => getAll(db.institutes, filter),
}

export const Fields = {
  add: (data) => addRecord(db.fields, 'fields', data, data.instituteId),
  update: (id, changes, instituteId) => updateRecord(db.fields, 'fields', id, changes, instituteId),
  delete: (id, instituteId) => softDelete(db.fields, 'fields', id, instituteId),
  getById: (id) => getById(db.fields, id),
  getByInstitute: (instituteId) => getAll(db.fields, r => r.instituteId === instituteId),
}

export const Templates = {
  add: (data) => addRecord(db.templates, 'templates', data, data.instituteId),
  update: (id, changes, instituteId) => updateRecord(db.templates, 'templates', id, changes, instituteId),
  delete: (id, instituteId) => softDelete(db.templates, 'templates', id, instituteId),
  getById: (id) => getById(db.templates, id),
  getByInstitute: (instituteId) => getAll(db.templates, r => r.instituteId === instituteId),
}

export const Students = {
  add: (data) => addRecord(db.students, 'students', data, data.instituteId),
  update: (id, changes, instituteId) => updateRecord(db.students, 'students', id, changes, instituteId),
  delete: (id, instituteId) => softDelete(db.students, 'students', id, instituteId),
  restore: (id) => restore(db.students, 'students', id),
  getById: (id) => getById(db.students, id),
  getAll: (filter) => getAll(db.students, filter),
  getByInstitute: (instituteId) =>
    getAll(db.students, r => r.instituteId === instituteId),
  getByInstituteAndStatus: (instituteId, status) =>
    getAll(db.students, r => r.instituteId === instituteId && r.status === status),
}

export const Fees = {
  add: (data) => addRecord(db.fees, 'fees', data, data.instituteId),
  update: (id, changes, instituteId) => updateRecord(db.fees, 'fees', id, changes, instituteId),
  getById: (id) => getById(db.fees, id),
  getByStudent: (studentId) => db.fees.where('studentId').equals(studentId).toArray(),
  getByInstitute: (instituteId) => db.fees.where('instituteId').equals(instituteId).toArray(),
}

// ---------------------------------------------------------------------------
// Receipts — receipt number always comes from utils/receiptNumber.js
// Direct call: getNextReceiptNumber(instituteId, instituteName)
// ---------------------------------------------------------------------------

export const Receipts = {
  /**
   * Add a receipt.
   * receiptNumber MUST be passed — always generate it via
   * getNextReceiptNumber(instituteId, instituteName) before calling this.
   */
  add: async (data) => {
    if (!data.receiptNumber) {
      throw new Error(
        'receiptNumber is required. Generate it with getNextReceiptNumber() from utils/receiptNumber.js'
      )
    }
    return addRecord(db.receipts, 'receipts', data, data.instituteId)
  },
  getById: (id) => getById(db.receipts, id),
  getByStudent: (studentId) => db.receipts.where('studentId').equals(studentId).toArray(),
  getByInstitute: (instituteId) => db.receipts.where('instituteId').equals(instituteId).toArray(),
  getByReceiptNumber: (receiptNumber) =>
    db.receipts.where('receiptNumber').equals(receiptNumber).first(),
}