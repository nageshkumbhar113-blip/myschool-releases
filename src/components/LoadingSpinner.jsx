/**
 * LoadingSpinner.jsx
 *
 * Reusable loading indicator.
 *
 * Props:
 *   size     — 'sm' | 'md' | 'lg' | 'xl'   (default 'md')
 *   fullPage — boolean  center on full viewport
 *   text     — string   optional label beside spinner
 *   className — extra classes
 */

import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

const SIZES = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
}

export default function LoadingSpinner({ size = 'md', fullPage = false, text = '', className = '' }) {
  const spinner = (
    <div className={clsx('flex items-center justify-center gap-2.5', className)}>
      <Loader2 className={clsx(SIZES[size] ?? SIZES.md, 'animate-spin text-primary-600 dark:text-primary-400')} />
      {text && (
        <span className="text-sm text-gray-500 dark:text-gray-400">{text}</span>
      )}
    </div>
  )

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 dark:bg-gray-950/60 backdrop-blur-sm">
        {spinner}
      </div>
    )
  }

  return spinner
}

/** Centered spinner for page-level loading (inside a content area) */
export function PageLoader({ text = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center py-24">
      <LoadingSpinner size="lg" text={text} />
    </div>
  )
}
