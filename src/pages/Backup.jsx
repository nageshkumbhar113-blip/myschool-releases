/**
 * Backup.jsx
 *
 * Real backup / restore page.
 *
 * BONUS additions:
 *   - Last backup date: stored in localStorage after every export.
 *     Shown on page + in DB stats header.
 *   - Reminder popup: if no backup in BACKUP_REMINDER_DAYS days,
 *     a warning banner appears on page load. Dismissible per session.
 *
 * Export: reads every IndexedDB table → downloads JSON file.
 * Import: user picks JSON file → validate → show summary → confirm → bulkPut.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  Database, Upload, Download, CheckCircle, AlertCircle,
  Loader2, FileJson, RefreshCw, Trash2, Info, AlertTriangle,
  ShieldCheck, Clock, BellRing, X,
} from 'lucide-react'
import {
  exportBackup,
  validateBackupFile,
  applyRestore,
  getCurrentCounts,
  TABLE_LABELS,
} from '../utils/backup'
import { getCurrentInstituteId, getCurrentInstituteName } from '../utils/dbHelpers'
import clsx from 'clsx'

// ── Constants ─────────────────────────────────────────────────────────────

/** Show reminder banner if no backup taken in this many days */
const BACKUP_REMINDER_DAYS = 7

/** localStorage key for last backup timestamp */
const LS_LAST_BACKUP_KEY = 'myschool_last_backup_at'

// ── Backup date helpers ───────────────────────────────────────────────────

function getLastBackupDate() {
  try {
    const raw = localStorage.getItem(LS_LAST_BACKUP_KEY)
    return raw ? new Date(raw) : null
  } catch {
    return null
  }
}

function saveLastBackupDate() {
  try {
    localStorage.setItem(LS_LAST_BACKUP_KEY, new Date().toISOString())
  } catch { /* ignore */ }
}

function daysSinceBackup(date) {
  if (!date) return null
  const ms = Date.now() - date.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function formatBackupDate(date) {
  if (!date) return null
  return date.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Small helpers ─────────────────────────────────────────────────────────

function Badge({ color = 'gray', children }) {
  const colors = {
    green:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    red:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    blue:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    gray:   'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  }
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', colors[color])}>
      {children}
    </span>
  )
}

function Alert({ icon: Icon = Info, color = 'blue', children }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300',
    red:    'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300',
    green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300',
  }
  return (
    <div className={clsx('flex items-start gap-2 p-3 rounded-xl border text-sm', colors[color])}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  )
}

// ── Last Backup Status bar ────────────────────────────────────────────────

function LastBackupStatus({ lastBackupDate, onExportClick }) {
  const days = daysSinceBackup(lastBackupDate)

  if (!lastBackupDate) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-sm">
        <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
        <span className="text-yellow-800 dark:text-yellow-300 flex-1">
          No backup taken yet for this device.
        </span>
        <button
          onClick={onExportClick}
          className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 underline underline-offset-2 hover:no-underline"
        >
          Take backup now
        </button>
      </div>
    )
  }

  const isOld  = days >= BACKUP_REMINDER_DAYS
  const isVery = days >= BACKUP_REMINDER_DAYS * 2

  return (
    <div className={clsx(
      'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm',
      isVery ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      : isOld ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    )}>
      <Clock className={clsx(
        'w-4 h-4 shrink-0',
        isVery ? 'text-red-600 dark:text-red-400'
        : isOld ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-green-600 dark:text-green-400',
      )} />

      <span className={clsx(
        'flex-1',
        isVery ? 'text-red-800 dark:text-red-300'
        : isOld ? 'text-yellow-800 dark:text-yellow-300'
        : 'text-green-800 dark:text-green-300',
      )}>
        Last backup:{' '}
        <strong>{formatBackupDate(lastBackupDate)}</strong>
        {' '}
        <span className="opacity-75">
          ({days === 0 ? 'Today' : days === 1 ? 'Yesterday' : `${days} days ago`})
        </span>
      </span>

      {isOld && (
        <button
          onClick={onExportClick}
          className={clsx(
            'text-xs font-semibold underline underline-offset-2 hover:no-underline shrink-0',
            isVery ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400',
          )}
        >
          Backup now
        </button>
      )}
    </div>
  )
}

// ── Reminder Popup ────────────────────────────────────────────────────────

function BackupReminderPopup({ lastBackupDate, days, onExportClick, onDismiss }) {
  const isNever = !lastBackupDate
  const isVery  = days !== null && days >= BACKUP_REMINDER_DAYS * 2

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top color bar */}
        <div className={clsx(
          'h-1.5 w-full',
          isVery ? 'bg-red-500' : 'bg-yellow-500',
        )} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start gap-3 mb-3">
            <div className={clsx(
              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
              isVery ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30',
            )}>
              <BellRing className={clsx(
                'w-5 h-5',
                isVery ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400',
              )} />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {isNever ? 'No backup taken yet!' : isVery ? 'Backup overdue!' : 'Backup reminder'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isNever
                  ? 'Protect your data — take your first backup now.'
                  : `Last backup was ${days} days ago. Regular backups prevent data loss.`
                }
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tip */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-600 dark:text-gray-400 mb-4">
            💡 Recommended: take a backup <strong>every 7 days</strong> and store the file in Google Drive or a USB drive.
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => { onExportClick(); onDismiss() }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors',
                isVery ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-500 hover:bg-yellow-600',
              )}
            >
              <Download className="w-4 h-4" />
              Download Backup
            </button>
            <button
              onClick={onDismiss}
              className="px-4 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Counts table ──────────────────────────────────────────────────────────

function CountsTable({ title, counts, compareWith }) {
  const tables = Object.keys(TABLE_LABELS)
  return (
    <div>
      {title && (
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          {title}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tables.map(t => {
          const n    = counts?.[t] ?? 0
          const prev = compareWith?.[t] ?? null
          const diff = prev !== null ? n - prev : null

          return (
            <div key={t} className="bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{TABLE_LABELS[t]}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white">{n}</span>
                {diff !== null && diff !== 0 && (
                  <span className={clsx(
                    'text-xs font-medium',
                    diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                  )}>
                    {diff > 0 ? `+${diff}` : diff}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function Backup() {
  const instituteId   = getCurrentInstituteId()
  const instituteName = getCurrentInstituteName()

  // ── Last backup state ───────────────────────────────────────────────────
  const [lastBackupDate,   setLastBackupDate]   = useState(() => getLastBackupDate())
  const [showReminder,     setShowReminder]     = useState(false)

  // Show reminder popup on mount if backup is overdue
  useEffect(() => {
    const days = daysSinceBackup(lastBackupDate)
    // Show if: never backed up, OR last backup > BACKUP_REMINDER_DAYS days ago
    if (!lastBackupDate || (days !== null && days >= BACKUP_REMINDER_DAYS)) {
      // Small delay so page renders first
      const tid = setTimeout(() => setShowReminder(true), 800)
      return () => clearTimeout(tid)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Existing state ──────────────────────────────────────────────────────
  const [currentCounts,  setCurrentCounts]  = useState({})
  const [exporting,      setExporting]      = useState(false)
  const [exportResult,   setExportResult]   = useState(null)

  const [importFile,     setImportFile]     = useState(null)
  const [validation,     setValidation]     = useState(null)
  const [validating,     setValidating]     = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [importing,      setImporting]      = useState(false)
  const [importResult,   setImportResult]   = useState(null)

  const [toast,          setToast]          = useState(null)
  const fileRef = useRef(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  useEffect(() => {
    getCurrentCounts().then(setCurrentCounts).catch(() => {})
  }, [importResult])

  // ── Export ───────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true)
    setExportResult(null)
    try {
      const { counts } = await exportBackup(instituteId, instituteName)
      setExportResult({ counts })

      // ✅ Save last backup date
      saveLastBackupDate()
      setLastBackupDate(new Date())
      setShowReminder(false)

      showToast('Backup file downloaded successfully')
    } catch (err) {
      console.error('Export error:', err)
      showToast('Export failed: ' + (err.message ?? 'Unknown error'), 'error')
    } finally {
      setExporting(false)
    }
  }

  // ── File pick & validate ──────────────────────────────────────────────────

  const handleFilePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImportFile(file)
    setValidation(null)
    setShowConfirm(false)
    setImportResult(null)
    setValidating(true)

    try {
      const result = await validateBackupFile(file)
      setValidation(result)
    } catch (err) {
      setValidation({ ok: false, errors: [err.message ?? 'Validation failed'], warnings: [] })
    } finally {
      setValidating(false)
    }
  }

  const handleDropFile = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    handleFilePick({ target: { files: [file], value: '' } })
  }

  // ── Restore ───────────────────────────────────────────────────────────────

  const handleRestore = async () => {
    if (!validation?.ok || !validation?.backup) return
    setImporting(true)
    setShowConfirm(false)
    try {
      const written = await applyRestore(validation.backup)
      setImportResult(written)
      setImportFile(null)
      setValidation(null)
      showToast('Restore complete! All records imported successfully.')
    } catch (err) {
      console.error('Restore error:', err)
      showToast('Restore failed: ' + (err.message ?? 'Unknown error'), 'error')
    } finally {
      setImporting(false)
    }
  }

  const resetImport = () => {
    setImportFile(null)
    setValidation(null)
    setShowConfirm(false)
    setImportResult(null)
  }

  const totalCurrent = Object.values(currentCounts).reduce((s, n) => s + n, 0)
  const days         = daysSinceBackup(lastBackupDate)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── Reminder Popup ─────────────────────────────────────────────── */}
      {showReminder && (
        <BackupReminderPopup
          lastBackupDate={lastBackupDate}
          days={days}
          onExportClick={handleExport}
          onDismiss={() => setShowReminder(false)}
        />
      )}

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Backup & Restore</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Export all your data as a JSON file or restore from a previous backup.
        </p>
      </div>

      {/* ── Last Backup Status bar ──────────────────────────────────────── */}
      <LastBackupStatus
        lastBackupDate={lastBackupDate}
        onExportClick={handleExport}
      />

      {/* Current DB stats */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Current Database</h3>
          <span className="ml-auto text-xs text-gray-400">{totalCurrent} total records</span>
        </div>
        <CountsTable counts={currentCounts} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* ── EXPORT card ─────────────────────────────────────────────────── */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Export Backup</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Download JSON backup file</p>
            </div>
          </div>

          <div className="flex-1 space-y-2 mb-5">
            {Object.keys(TABLE_LABELS).map(t => (
              <div key={t} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                {TABLE_LABELS[t]} ({currentCounts[t] ?? 0} records)
              </div>
            ))}
          </div>

          {exportResult && (
            <Alert icon={CheckCircle} color="green">
              Backup downloaded — {Object.values(exportResult.counts).reduce((s, n) => s + n, 0)} records exported.
            </Alert>
          )}

          <button
            onClick={handleExport}
            disabled={exporting}
            className={clsx(
              'mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold transition-colors',
              exporting
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white',
            )}
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
              : <><Download className="w-4 h-4" /> Download Backup</>
            }
          </button>
        </div>

        {/* ── IMPORT card ─────────────────────────────────────────────────── */}
        <div className="card p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Restore Backup</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Import from JSON backup file</p>
            </div>
          </div>

          {/* Drop zone */}
          {!importFile && !importResult && (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDropFile}
              onClick={() => fileRef.current?.click()}
              className="flex-1 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50/50 dark:hover:bg-green-900/10 transition-colors mb-4"
            >
              <FileJson className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Drop backup file here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse (.json)</p>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFilePick}
          />

          {validating && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Validating file…</span>
            </div>
          )}

          {validation && !validation.ok && (
            <div className="space-y-3 flex-1">
              <Alert icon={AlertCircle} color="red">
                <p className="font-semibold mb-1">Invalid backup file</p>
                <ul className="space-y-0.5">
                  {validation.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </Alert>
              <button onClick={resetImport} className="btn-secondary w-full justify-center text-sm">
                <RefreshCw className="w-4 h-4" /> Try Another File
              </button>
            </div>
          )}

          {validation?.ok && !showConfirm && !importing && !importResult && (
            <div className="flex-1 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">File</span>
                  <span className="font-medium text-gray-900 dark:text-white truncate ml-2 max-w-[180px]">{importFile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Version</span>
                  <span className="font-medium text-gray-900 dark:text-white">{validation.backup.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Exported</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(validation.backup.exportedAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              <CountsTable
                title="Records to import"
                counts={validation.counts}
                compareWith={currentCounts}
              />

              {validation.warnings.length > 0 && (
                <Alert icon={AlertTriangle} color="yellow">
                  <p className="font-semibold mb-1">Warnings</p>
                  <ul>{validation.warnings.map((w, i) => <li key={i}>• {w}</li>)}</ul>
                </Alert>
              )}

              <Alert icon={AlertTriangle} color="yellow">
                <strong>Last-write-wins:</strong> Existing records with the same ID will be overwritten. This cannot be undone.
              </Alert>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors"
                >
                  <Upload className="w-4 h-4" /> Restore Now
                </button>
                <button onClick={resetImport} className="btn-secondary px-3">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {showConfirm && !importing && (
            <div className="flex-1 space-y-4">
              <Alert icon={AlertCircle} color="red">
                <p className="font-bold mb-1">Final confirmation</p>
                <p>This will overwrite <strong>{Object.values(validation?.counts ?? {}).reduce((s, n) => s + n, 0)}</strong> records in your database. Are you absolutely sure?</p>
              </Alert>
              <div className="flex gap-2">
                <button
                  onClick={handleRestore}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  <CheckCircle className="w-4 h-4" /> Yes, Restore
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {importing && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Restoring data…</p>
            </div>
          )}

          {importResult && (
            <div className="flex-1 space-y-4">
              <Alert icon={ShieldCheck} color="green">
                <p className="font-bold mb-1">Restore complete!</p>
                <p>All records have been imported successfully.</p>
              </Alert>
              <CountsTable title="Records written" counts={importResult} />
              <button onClick={resetImport} className="btn-secondary w-full justify-center text-sm">
                <RefreshCw className="w-4 h-4" /> Import Another File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
        )}>
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4" />
            : <CheckCircle className="w-4 h-4" />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}