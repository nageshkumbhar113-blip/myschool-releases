import React from 'react'
import { CreditCard, CheckCircle, Clock, AlertCircle, TrendingDown } from 'lucide-react'
import { formatCurrency, getFeeStatus, FEE_STATUS_META, computeFee } from '../utils/feeCalculations'
import clsx from 'clsx'

/**
 * FeeCard — summary card for a student's fee record.
 *
 * Props:
 *   fee          — fee record (may be null)
 *   onCollect    — () => void  (opens installment modal)
 *   compact      — bool (smaller card for list views)
 */
export default function FeeCard({ fee, onCollect, compact = false }) {
  if (!fee) {
    return (
      <div className="card p-5 flex items-center gap-3 text-gray-400">
        <CreditCard className="w-5 h-5 shrink-0" />
        <span className="text-sm">No fee record</span>
      </div>
    )
  }

  const status   = getFeeStatus(fee)
  const meta     = FEE_STATUS_META[status]
  const progress = fee.effectiveFee > 0
    ? Math.min(100, Math.round((fee.paidAmount / fee.effectiveFee) * 100))
    : 0

  const StatusIcon = {
    paid:    CheckCircle,
    partial: Clock,
    overdue: AlertCircle,
    pending: Clock,
  }[status] ?? Clock

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        {/* Progress bar */}
        <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-500',
              status === 'paid'    && 'bg-green-500',
              status === 'partial' && 'bg-yellow-500',
              status === 'overdue' && 'bg-red-500',
              status === 'pending' && 'bg-gray-300 dark:bg-gray-600',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={clsx('text-xs font-medium shrink-0', meta.text)}>{progress}%</span>
        <span className={clsx('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', meta.bg, meta.text)}>
          <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className={clsx('px-5 py-3 flex items-center justify-between', meta.bg)}>
        <div className="flex items-center gap-2">
          <StatusIcon className={clsx('w-4 h-4', meta.text)} />
          <span className={clsx('text-sm font-semibold', meta.text)}>{meta.label}</span>
        </div>
        <span className={clsx('text-xs font-mono font-bold', meta.text)}>{progress}% paid</span>
      </div>

      {/* Stats */}
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
          <Stat label="Total Fee"      value={formatCurrency(fee.totalFee)}       />
          <Stat label="Discount"       value={formatCurrency(fee.discount)}        dimmed />
          <Stat label="Effective Fee"  value={formatCurrency(fee.effectiveFee)}   highlight />
          <Stat label="Paid"           value={formatCurrency(fee.paidAmount)}      green />
          <Stat label="Remaining"      value={formatCurrency(fee.remainingAmount)} red={fee.remainingAmount > 0} />
          <Stat label="Installments"   value={fee.installments?.length ?? 0}      />
        </div>

        {/* Progress bar */}
        <div className="mb-1 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Payment progress</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-700',
              status === 'paid'    && 'bg-green-500',
              status === 'partial' && 'bg-yellow-500',
              status === 'overdue' && 'bg-red-500',
              status === 'pending' && 'bg-gray-300 dark:bg-gray-600',
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Collect button */}
        {status !== 'paid' && onCollect && (
          <button onClick={onCollect} className="btn-primary w-full justify-center mt-4">
            <CreditCard className="w-4 h-4" /> Collect Payment
          </button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, dimmed, highlight, green, red }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={clsx(
        'text-sm font-bold',
        dimmed    && 'text-gray-400 dark:text-gray-500',
        highlight && 'text-gray-900 dark:text-white',
        green     && 'text-green-600 dark:text-green-400',
        red       && 'text-red-600 dark:text-red-400',
        !dimmed && !highlight && !green && !red && 'text-gray-700 dark:text-gray-300',
      )}>
        {value}
      </p>
    </div>
  )
}
