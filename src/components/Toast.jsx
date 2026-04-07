/**
 * Toast.jsx
 *
 * Global toast notification system.
 *
 * 1. Mount <Toaster /> once (in App.jsx or DashboardLayout).
 * 2. Use the hook anywhere:
 *      const toast = useToast()
 *      toast.success('Saved!')
 *      toast.error('Something failed')
 *      toast.warning('Expiring soon')
 *      toast.info('FYI…')
 *
 * Types: 'success' | 'error' | 'warning' | 'info'
 */

import { useEffect, useRef } from 'react'
import { create } from 'zustand'
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import clsx from 'clsx'

// ── Store ──────────────────────────────────────────────────────────────────

const useToastStore = create((set, get) => ({
  toasts: [],

  push(options) {
    const id       = crypto.randomUUID()
    const duration = options.duration ?? (options.type === 'error' ? 5000 : 3500)
    const toast    = { id, type: 'info', message: '', ...options, duration }

    set(state => ({ toasts: [...state.toasts, toast] }))

    if (duration > 0) {
      setTimeout(() => get().dismiss(id), duration)
    }
    return id
  },

  dismiss(id) {
    set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
  },

  dismissAll() {
    set({ toasts: [] })
  },
}))

// ── Hook ───────────────────────────────────────────────────────────────────

export function useToast() {
  const { push, dismiss, dismissAll } = useToastStore()
  return {
    success: (message, opts) => push({ ...opts, message, type: 'success' }),
    error:   (message, opts) => push({ ...opts, message, type: 'error'   }),
    warning: (message, opts) => push({ ...opts, message, type: 'warning' }),
    info:    (message, opts) => push({ ...opts, message, type: 'info'    }),
    dismiss,
    dismissAll,
  }
}

// ── Individual toast item ──────────────────────────────────────────────────

const TOAST_STYLES = {
  success: {
    bar:  'bg-green-500',
    icon: CheckCircle,
    wrap: 'border-green-200 dark:border-green-800 bg-white dark:bg-gray-900',
    text: 'text-gray-900 dark:text-white',
    sub:  'text-green-600 dark:text-green-400',
  },
  error: {
    bar:  'bg-red-500',
    icon: AlertCircle,
    wrap: 'border-red-200 dark:border-red-800 bg-white dark:bg-gray-900',
    text: 'text-gray-900 dark:text-white',
    sub:  'text-red-600 dark:text-red-400',
  },
  warning: {
    bar:  'bg-amber-400',
    icon: AlertTriangle,
    wrap: 'border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-900',
    text: 'text-gray-900 dark:text-white',
    sub:  'text-amber-600 dark:text-amber-400',
  },
  info: {
    bar:  'bg-blue-500',
    icon: Info,
    wrap: 'border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900',
    text: 'text-gray-900 dark:text-white',
    sub:  'text-blue-600 dark:text-blue-400',
  },
}

function ToastItem({ toast }) {
  const dismiss  = useToastStore(s => s.dismiss)
  const style    = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info
  const Icon     = style.icon
  const barRef   = useRef(null)

  // Animate progress bar
  useEffect(() => {
    if (!barRef.current || !toast.duration) return
    barRef.current.style.transition = `width ${toast.duration}ms linear`
    requestAnimationFrame(() => {
      if (barRef.current) barRef.current.style.width = '0%'
    })
  }, [toast.duration])

  return (
    <div
      className={clsx(
        'relative flex items-start gap-3 pr-4 pl-4 py-3.5 rounded-xl border shadow-lg max-w-sm w-full overflow-hidden',
        'animate-in slide-in-from-right-4 fade-in duration-300',
        style.wrap,
      )}
    >
      {/* Left color bar */}
      <div className={clsx('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', style.bar)} />

      {/* Icon */}
      <div className={clsx('shrink-0 mt-0.5', style.sub)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={clsx('text-sm font-semibold', style.text)}>{toast.title}</p>
        )}
        <p className={clsx('text-sm', toast.title ? 'text-gray-500 dark:text-gray-400 mt-0.5' : style.text)}>
          {toast.message}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={() => dismiss(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mt-0.5"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-100 dark:bg-gray-800">
          <div
            ref={barRef}
            className={clsx('h-full', style.bar, 'opacity-50')}
            style={{ width: '100%' }}
          />
        </div>
      )}
    </div>
  )
}

// ── Toaster (mount once in App) ────────────────────────────────────────────

export function Toaster() {
  const toasts = useToastStore(s => s.toasts)

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[200] flex flex-col gap-2.5 items-end pointer-events-none"
    >
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} />
        </div>
      ))}
    </div>
  )
}

export default Toaster
