/**
 * ConfirmModal.jsx
 *
 * Promise-based global confirm dialog.
 *
 * Setup — mount <ConfirmModalRoot /> once in App.jsx or DashboardLayout.
 *
 * Usage anywhere:
 *   const confirm = useConfirm()
 *   const ok = await confirm({
 *     title:   'Delete Student?',
 *     message: 'This cannot be undone.',
 *     confirm: 'Delete',
 *     danger:  true,
 *   })
 *   if (ok) { ... }
 *
 * Keyboard: Enter = confirm, Escape = cancel.
 */

import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { AlertTriangle, Info, Trash2, X } from 'lucide-react'
import clsx from 'clsx'

// ── Store ──────────────────────────────────────────────────────────────────

const useConfirmStore = create((set, get) => ({
  isOpen:  false,
  config:  null,
  resolve: null,

  show(config) {
    return new Promise(resolve => {
      set({ isOpen: true, config, resolve })
    })
  },

  accept() {
    const { resolve } = get()
    set({ isOpen: false, config: null, resolve: null })
    resolve?.(true)
  },

  cancel() {
    const { resolve } = get()
    set({ isOpen: false, config: null, resolve: null })
    resolve?.(false)
  },
}))

// ── Hook ───────────────────────────────────────────────────────────────────

export function useConfirm() {
  const show = useConfirmStore(s => s.show)
  return show
}

// ── Modal component ────────────────────────────────────────────────────────

export function ConfirmModalRoot() {
  const { isOpen, config, accept, cancel } = useConfirmStore()
  const confirmBtnRef = useRef(null)

  // Focus the confirm button when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Keyboard: Enter = confirm, Escape = cancel
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => {
      if (e.key === 'Escape') cancel()
      if (e.key === 'Enter')  accept()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  if (!isOpen || !config) return null

  const {
    title    = 'Are you sure?',
    message  = '',
    confirm  = 'Confirm',
    cancel: cancelLabel = 'Cancel',
    danger   = false,
    icon,
  } = config

  const Icon = icon ?? (danger ? Trash2 : Info)

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[150] bg-black/50 backdrop-blur-sm"
        onClick={cancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="fixed inset-0 z-[151] flex items-center justify-center p-4"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md">

          {/* Header */}
          <div className="flex items-start gap-4 p-6 pb-4">
            <div className={clsx(
              'w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              danger
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-blue-100 dark:bg-blue-900/30',
            )}>
              <Icon className={clsx(
                'w-5 h-5',
                danger
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-blue-600 dark:text-blue-400',
              )} />
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3
                id="confirm-title"
                className="text-base font-bold text-gray-900 dark:text-white"
              >
                {title}
              </h3>
              {message && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  {message}
                </p>
              )}
            </div>
            <button
              onClick={cancel}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 px-6 pb-5">
            <button
              onClick={cancel}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={accept}
              className={clsx(
                'px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                danger
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-primary-600 hover:bg-primary-700 focus:ring-primary-500',
              )}
            >
              {confirm}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default ConfirmModalRoot
