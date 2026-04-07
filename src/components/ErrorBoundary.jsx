/**
 * ErrorBoundary.jsx
 *
 * React class-based error boundary.
 * Catches render / lifecycle errors anywhere in the component tree below it.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <MyPage />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Oops</p>}>
 *     ...
 *   </ErrorBoundary>
 */

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

// ── Fallback UI ────────────────────────────────────────────────────────────

function DefaultFallback({ error, errorInfo, onReset }) {
  const isDev = import.meta.env.DEV

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-5">
        {/* Icon */}
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Message */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            An unexpected error occurred on this page. Your data is safe — try refreshing or go back to the dashboard.
          </p>
        </div>

        {/* Dev error details */}
        {isDev && error && (
          <details className="text-left bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-xs">
            <summary className="font-semibold text-red-700 dark:text-red-400 cursor-pointer mb-2">
              Error details (dev only)
            </summary>
            <p className="font-mono text-red-600 dark:text-red-400 mb-2 break-all">
              {error.toString()}
            </p>
            {errorInfo?.componentStack && (
              <pre className="text-gray-500 dark:text-gray-400 overflow-auto text-[10px] leading-relaxed whitespace-pre-wrap">
                {errorInfo.componentStack}
              </pre>
            )}
          </details>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => { window.location.href = '/' }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Error Boundary class ───────────────────────────────────────────────────

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
    this.reset  = this.reset.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
    // Call optional onError prop (e.g. for logging to a service)
    this.props.onError?.(error, errorInfo)
  }

  reset() {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <DefaultFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.reset}
        />
      )
    }
    return this.props.children
  }
}

/** Convenience HOC wrapper */
export function withErrorBoundary(Component, props = {}) {
  return function WrappedWithBoundary(componentProps) {
    return (
      <ErrorBoundary {...props}>
        <Component {...componentProps} />
      </ErrorBoundary>
    )
  }
}
