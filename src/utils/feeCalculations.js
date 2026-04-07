/**
 * feeCalculations.js
 * Pure utility functions for all fee-related math.
 * No side effects — safe to call anywhere.
 */

// ── Currency format ────────────────────────────────────────────────────────
export const formatCurrency = (amount) =>
  `₹${Number(amount ?? 0).toLocaleString('en-IN')}`

// ── Core calculation ───────────────────────────────────────────────────────

/**
 * Derive the computed fields from raw inputs.
 * Always keeps remainingAmount ≥ 0.
 *
 * @param {number} totalFee
 * @param {number} discount      — must be 0 ≤ discount ≤ totalFee
 * @param {number} paidAmount    — sum of all installment amounts
 * @returns {{ effectiveFee, paidAmount, remainingAmount }}
 */
export function computeFee(totalFee, discount = 0, paidAmount = 0) {
  const total      = Math.max(0, Number(totalFee) || 0)
  const disc       = Math.min(Math.max(0, Number(discount) || 0), total)
  const effective  = total - disc
  const paid       = Math.min(Math.max(0, Number(paidAmount) || 0), effective)
  const remaining  = effective - paid

  return {
    totalFee:        total,
    discount:        disc,
    effectiveFee:    effective,
    paidAmount:      paid,
    remainingAmount: Math.max(0, remaining),
  }
}

// ── Status ─────────────────────────────────────────────────────────────────

/**
 * Determine the display status of a fee record.
 *
 * @param {{ effectiveFee, paidAmount, remainingAmount, dueDate? }} fee
 * @returns {'paid'|'partial'|'overdue'|'pending'}
 */
export function getFeeStatus(fee) {
  if (!fee) return 'pending'
  const { effectiveFee, paidAmount, remainingAmount, dueDate } = fee

  if (remainingAmount <= 0)   return 'paid'
  if (paidAmount > 0)         return 'partial'

  if (dueDate && new Date(dueDate) < new Date()) return 'overdue'
  return 'pending'
}

export const FEE_STATUS_META = {
  paid:    { label: 'Paid',    bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  dot: 'bg-green-500'  },
  partial: { label: 'Partial', bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', dot: 'bg-yellow-500' },
  overdue: { label: 'Overdue', bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-400',    dot: 'bg-red-500'    },
  pending: { label: 'Pending', bg: 'bg-gray-100 dark:bg-gray-800',     text: 'text-gray-600 dark:text-gray-400',   dot: 'bg-gray-400'   },
}

// ── Installment helpers ────────────────────────────────────────────────────

/**
 * Validate an installment amount before accepting it.
 *
 * @param {number} amount
 * @param {number} remainingAmount
 * @returns {string|null}  error message or null
 */
export function validateInstallment(amount, remainingAmount) {
  const n = Number(amount)
  if (!n || n <= 0)             return 'Amount must be greater than zero'
  if (n > remainingAmount)      return `Amount cannot exceed remaining ₹${remainingAmount.toLocaleString('en-IN')}`
  return null
}

/**
 * Add an installment to a fee record's installments array and recompute totals.
 * Returns the updated fee record. Does NOT mutate the original.
 *
 * @param {object} feeRecord
 * @param {{ id, amount, date, paymentMode, receiptNumber, receiptId }} installment
 * @returns {object}  updated fee record
 */
export function applyInstallment(feeRecord, installment) {
  const installments = [...(feeRecord.installments ?? []), installment]
  const paidAmount   = installments.reduce((s, i) => s + Number(i.amount), 0)

  const computed = computeFee(feeRecord.totalFee, feeRecord.discount, paidAmount)
  return {
    ...feeRecord,
    ...computed,
    installments,
  }
}

/**
 * Suggest equal installment amounts given an effective fee and count.
 * The last installment absorbs any rounding remainder.
 *
 * @param {number} effectiveFee
 * @param {number} count
 * @returns {number[]}
 */
export function suggestInstallments(effectiveFee, count) {
  if (!count || count < 1) return [effectiveFee]
  const each = Math.floor(effectiveFee / count)
  const remainder = effectiveFee - each * count
  return Array.from({ length: count }, (_, i) =>
    i === count - 1 ? each + remainder : each
  )
}

// ── Academic year helper ───────────────────────────────────────────────────

/** Returns current academic year string, e.g. "2024-25" */
export function currentAcademicYear() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1 // 1-12
  const start = month >= 6 ? year : year - 1
  return `${start}-${String(start + 1).slice(-2)}`
}

// ── Summary aggregation ───────────────────────────────────────────────────

/**
 * Aggregate an array of fee records into totals for a summary dashboard.
 *
 * @param {object[]} fees
 * @returns {{ totalExpected, totalCollected, totalPending, totalDiscount, count }}
 */
export function aggregateFees(fees) {
  return fees.reduce(
    (acc, f) => ({
      totalExpected:  acc.totalExpected  + (f.effectiveFee    ?? 0),
      totalCollected: acc.totalCollected + (f.paidAmount       ?? 0),
      totalPending:   acc.totalPending   + (f.remainingAmount  ?? 0),
      totalDiscount:  acc.totalDiscount  + (f.discount         ?? 0),
      count:          acc.count + 1,
    }),
    { totalExpected: 0, totalCollected: 0, totalPending: 0, totalDiscount: 0, count: 0 }
  )
}
