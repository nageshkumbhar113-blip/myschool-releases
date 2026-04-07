import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  X, CreditCard, CheckCircle, AlertTriangle,
  Loader2, CalendarDays, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  formatCurrency, validateInstallment, suggestInstallments,
} from '../utils/feeCalculations'
import clsx from 'clsx'

const PAYMENT_MODES = ['Cash', 'UPI', 'Online Transfer', 'Cheque', 'DD', 'Card']

// ── Installment Plan Generator ─────────────────────────────────────────────

function InstallmentPlanner({ remaining, onSelectAmount }) {
  const [open,  setOpen]  = useState(false)
  const [count, setCount] = useState(3)

  const plan = suggestInstallments(remaining, count)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800/50 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-primary-500" />
          Generate Installment Plan
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>

      {open && (
        <div className="p-3 space-y-3">
          {/* Count selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
              Split into
            </span>
            <div className="flex gap-1.5">
              {[2, 3, 4, 6, 12].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCount(n)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                    count === n
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">installments</span>
          </div>

          {/* Plan preview */}
          <div className="space-y-1.5">
            {plan.map((amt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectAmount(amt)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors group"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Installment {i + 1}
                  {i === plan.length - 1 && count > 1 && amt !== plan[0]
                    ? ' (adjusted)'
                    : ''}
                </span>
                <span className="text-sm font-bold text-primary-700 dark:text-primary-300 group-hover:underline">
                  {formatCurrency(amt)}
                </span>
              </button>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Click an installment to use that amount ↑
          </p>
        </div>
      )}
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────────────────

export default function InstallmentModal({ student, fee, onSubmit, onClose }) {
  const [success,    setSuccess]    = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      amount:      fee?.remainingAmount ?? '',
      date:        new Date().toISOString().split('T')[0],
      paymentMode: 'Cash',
    },
  })

  const watchAmount    = watch('amount')
  const validationError = validateInstallment(Number(watchAmount), fee?.remainingAmount ?? 0)

  const doSubmit = async (data) => {
    if (validationError) return
    setSubmitting(true)
    try {
      const result = await onSubmit({
        amount:      Number(data.amount),
        date:        data.date,
        paymentMode: data.paymentMode,
      })
      setSuccess({ receiptNumber: result.receiptNumber })
    } catch (err) {
      // Error shown by parent via toast
    } finally {
      setSubmitting(false)
    }
  }

  const studentName = student?.dynamicFields?.studentName ?? 'Student'
  const remaining   = fee?.remainingAmount ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">

        {/* ── Success state ─────────────────────────────────────── */}
        {success ? (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment Recorded</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Receipt{' '}
                <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">
                  {success.receiptNumber}
                </span>{' '}
                generated
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 w-full text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                Remaining balance:{' '}
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(fee?.remainingAmount ?? 0)}
                </span>
              </p>
            </div>
            <button onClick={onClose} className="btn-primary w-full justify-center">
              Done
            </button>
          </div>
        ) : (
          <>
            {/* ── Header ──────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Collect Payment
                </h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pt-4">
              {/* ── Student + Fee summary ─────────────────────────── */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 mb-4">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{studentName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {student?.class && `Class ${student.class}`}
                  {student?.rollNumber && ` · Roll ${student.rollNumber}`}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Effective: </span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatCurrency(fee?.effectiveFee)}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Paid: </span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(fee?.paidAmount)}
                    </span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Remaining: </span>
                    <span className="font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── Form ──────────────────────────────────────────── */}
              <form onSubmit={handleSubmit(doSubmit)} className="space-y-4 pb-5">

                {/* Amount */}
                <div>
                  <label className="label">
                    Amount (₹) <span className="text-red-500">*</span>
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      Max: {formatCurrency(remaining)}
                    </span>
                  </label>
                  <input
                    {...register('amount', { required: true, min: 1, max: remaining })}
                    type="number"
                    min="1"
                    max={remaining}
                    step="1"
                    className={clsx(
                      'input',
                      (validationError || errors.amount) && 'border-red-400 dark:border-red-600'
                    )}
                    placeholder={`Max ${formatCurrency(remaining)}`}
                  />
                  {validationError && (
                    <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                      <AlertTriangle className="w-3 h-3" /> {validationError}
                    </p>
                  )}
                </div>

                {/* Quick amount chips */}
                <div className="flex flex-wrap gap-2">
                  {[remaining, Math.floor(remaining / 2), Math.floor(remaining / 4)]
                    .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
                    .map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setValue('amount', v)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {formatCurrency(v)}
                      </button>
                    ))
                  }
                </div>

                {/* 🆕 Installment Plan Generator */}
                {remaining > 0 && (
                  <InstallmentPlanner
                    remaining={remaining}
                    onSelectAmount={(amt) => setValue('amount', amt)}
                  />
                )}

                {/* Payment mode */}
                <div>
                  <label className="label">
                    Payment Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_MODES.map(mode => (
                      <label key={mode} className="relative cursor-pointer">
                        <input
                          type="radio"
                          value={mode}
                          {...register('paymentMode')}
                          className="sr-only peer"
                        />
                        <div className={clsx(
                          'px-2 py-2 rounded-lg border-2 text-center text-xs font-medium transition-all',
                          'border-gray-200 dark:border-gray-700',
                          'peer-checked:border-primary-500 peer-checked:bg-primary-50 dark:peer-checked:bg-primary-900/20 peer-checked:text-primary-700 dark:peer-checked:text-primary-300',
                          'hover:border-gray-300 dark:hover:border-gray-600 text-gray-600 dark:text-gray-400',
                        )}>
                          {mode}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date */}
                <div>
                  <label className="label">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('date', { required: true })}
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    className="input"
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-secondary flex-1 justify-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !!validationError || remaining <= 0}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {submitting
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
                      : <><CreditCard className="w-4 h-4" /> Record Payment</>
                    }
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  )
}