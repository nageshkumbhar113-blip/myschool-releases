/**
 * ValidationWarningModal.jsx
 *
 * Shows validation results before document generation.
 *
 *   errors   — blocking (red). Generate button is disabled.
 *   warnings — non-blocking (yellow). User can still proceed.
 *
 * Props:
 *   errors    {Array}    — from useDocumentValidation
 *   warnings  {Array}    — from useDocumentValidation
 *   onProceed {Function} — called when user accepts warnings and generates
 *   onClose   {Function} — called on cancel
 */

import React, { useEffect } from 'react'
import { AlertTriangle, XCircle, X, ShieldAlert } from 'lucide-react'
import clsx from 'clsx'

function IssueRow({ issue, variant }) {
  const isError = variant === 'error'
  return (
    <li className={clsx(
      'flex items-start gap-2 text-sm px-3 py-2 rounded-lg',
      isError
        ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300'
        : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
    )}>
      {isError
        ? <XCircle       className="w-4 h-4 mt-0.5 shrink-0" />
        : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      }
      <span>{issue.message}</span>
    </li>
  )
}

export default function ValidationWarningModal({
  errors   = [],
  warnings = [],
  onProceed,
  onClose,
}) {
  const hasErrors   = errors.length > 0
  const hasWarnings = warnings.length > 0

  // Escape to close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-modal-title"
        className="fixed inset-0 z-[51] flex items-center justify-center p-4"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md flex flex-col max-h-[85vh]">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className={clsx(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              hasErrors
                ? 'bg-red-50 dark:bg-red-900/30'
                : 'bg-yellow-50 dark:bg-yellow-900/30'
            )}>
              <ShieldAlert className={clsx(
                'w-4 h-4',
                hasErrors
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-yellow-600 dark:text-yellow-400'
              )} />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="validation-modal-title"
                className="text-base font-semibold text-gray-900 dark:text-white"
              >
                {hasErrors ? 'Cannot Generate Document' : 'Warnings Found'}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {hasErrors
                  ? 'Fix the errors below before generating.'
                  : 'Review the warnings below. You can still proceed.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Errors */}
            {hasErrors && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-2">
                  Errors — must fix ({errors.length})
                </p>
                <ul className="space-y-1.5">
                  {errors.map((e, i) => (
                    <IssueRow key={i} issue={e} variant="error" />
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings */}
            {hasWarnings && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 mb-2">
                  Warnings ({warnings.length})
                </p>
                <ul className="space-y-1.5">
                  {warnings.map((w, i) => (
                    <IssueRow key={i} issue={w} variant="warning" />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onProceed}
              disabled={hasErrors}
              className={clsx(
                'btn-primary',
                hasErrors && 'opacity-40 cursor-not-allowed'
              )}
            >
              {hasErrors ? 'Cannot Generate' : 'Proceed Anyway'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
