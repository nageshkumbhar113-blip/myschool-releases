/**
 * auditLogger.js
 *
 * Convenience wrappers around the low-level auditLog() from helpers.js.
 * Provides structured, typed audit events with automatic error swallowing
 * (audit failures must never crash the main operation).
 *
 * Usage:
 *   import { AuditLogger } from './auditLogger'
 *   await AuditLogger.create('students', newRecord, instituteId)
 *   await AuditLogger.update('fees', before, after, instituteId)
 *   await AuditLogger.delete('students', record, instituteId)
 *   await AuditLogger.action('backup_export', { tables, recordCount }, instituteId)
 */

import { auditLog } from '../db/helpers'

// ── Action constants ───────────────────────────────────────────────────────

export const AUDIT_ACTIONS = {
  CREATE:          'CREATE',
  UPDATE:          'UPDATE',
  DELETE:          'DELETE',
  RESTORE:         'RESTORE',
  BACKUP_EXPORT:   'BACKUP_EXPORT',
  BACKUP_IMPORT:   'BACKUP_IMPORT',
  PROMOTE:         'PROMOTE',
  LICENSE_ACTIVATE:'LICENSE_ACTIVATE',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  PDF_GENERATE:    'PDF_GENERATE',
  EXCEL_EXPORT:    'EXCEL_EXPORT',
}

// ── Safe wrapper ───────────────────────────────────────────────────────────

/**
 * Emit an audit event without throwing.
 * All params are passed directly to auditLog().
 */
async function emit(params) {
  try {
    await auditLog(params)
  } catch (err) {
    // Audit failures must never crash the calling operation
    console.warn('[AuditLogger] Failed to emit audit event:', err)
  }
}

// ── Public API ─────────────────────────────────────────────────────────────

export const AuditLogger = {
  /**
   * Log a record creation.
   * @param {string} tableName
   * @param {object} record       — the newly created record
   * @param {string} [instituteId]
   */
  create(tableName, record, instituteId) {
    return emit({
      action:     AUDIT_ACTIONS.CREATE,
      tableName,
      recordId:   record?.id ?? 'unknown',
      before:     null,
      after:      record,
      instituteId: instituteId ?? record?.instituteId,
    })
  },

  /**
   * Log a record update.
   * @param {string} tableName
   * @param {object} before       — record state before change
   * @param {object} after        — record state after change
   * @param {string} [instituteId]
   */
  update(tableName, before, after, instituteId) {
    return emit({
      action:     AUDIT_ACTIONS.UPDATE,
      tableName,
      recordId:   before?.id ?? after?.id ?? 'unknown',
      before,
      after,
      instituteId: instituteId ?? after?.instituteId ?? before?.instituteId,
    })
  },

  /**
   * Log a record soft-deletion.
   * @param {string} tableName
   * @param {object} record       — the record being deleted
   * @param {string} [instituteId]
   */
  delete(tableName, record, instituteId) {
    return emit({
      action:     AUDIT_ACTIONS.DELETE,
      tableName,
      recordId:   record?.id ?? 'unknown',
      before:     record,
      after:      null,
      instituteId: instituteId ?? record?.instituteId,
    })
  },

  /**
   * Log a free-form action (backup, export, license events, etc.)
   * @param {string} action       — one of AUDIT_ACTIONS
   * @param {object} [metadata]   — any serialisable payload
   * @param {string} [instituteId]
   */
  action(action, metadata = {}, instituteId = null) {
    return emit({
      action,
      tableName:  metadata.tableName ?? 'system',
      recordId:   metadata.recordId  ?? 'system',
      before:     null,
      after:      metadata,
      instituteId,
    })
  },

  /** Shortcut: log a successful backup export */
  backupExport(counts, instituteId) {
    return this.action(AUDIT_ACTIONS.BACKUP_EXPORT, { counts }, instituteId)
  },

  /** Shortcut: log a backup restore / import */
  backupImport(written, instituteId) {
    return this.action(AUDIT_ACTIONS.BACKUP_IMPORT, { written }, instituteId)
  },

  /** Shortcut: log a student promotion batch */
  promote({ promoted, skipped, targetClass, targetYear }, instituteId) {
    return this.action(AUDIT_ACTIONS.PROMOTE, {
      promoted, skipped, targetClass, targetYear,
    }, instituteId)
  },
}

export default AuditLogger
