import React from 'react'
import { X, Download, MessageCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { formatReceiptParticularAmount, getFeeStructure } from '../utils/feeStructure'

const fmt = (n) => `Rs.${Number(n ?? 0).toLocaleString('en-IN')}`

const fmtDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

function Row({ label, value, valueClass }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className={clsx('font-medium text-gray-900 dark:text-white', valueClass)}>{value}</span>
    </div>
  )
}

function LegacyReceiptCard({ data }) {
  const { institute, student, receipt, fee } = data

  const instituteName = institute?.name ?? 'School Name'
  const instituteAddress = institute?.address ?? ''
  const institutePhone = institute?.phone ?? ''

  const studentName = student?.dynamicFields?.studentName ?? 'N/A'
  const studentClass = student?.class ?? '-'
  const rollNumber = student?.rollNumber ?? '-'

  const receiptNo = receipt?.receiptNumber ?? '-'
  const receiptDate = fmtDate(receipt?.paymentDate ?? receipt?.createdAt)
  const amount = Number(receipt?.amount ?? 0)
  const paymentMode = receipt?.paymentMode ?? 'Cash'
  const installmentNumber = receipt?.installmentNumber ?? '-'

  const allInstallments = fee?.installments ?? []
  const previousInstallments = allInstallments.filter((item) => item.receiptId !== receipt?.id)

  const totalFee = fee?.totalFee ?? 0
  const discount = fee?.discount ?? 0
  const totalPaid = fee?.paidAmount ?? 0
  const remaining = fee?.remainingAmount ?? 0
  const isPaid = remaining <= 0

  const particulars = getFeeStructure({ feeStructure: institute?.feeStructure ?? [] })
  const particularAmounts = student?.dynamicFields?.feeStructureAmounts ?? {}

  return (
    <div className="space-y-4 text-sm">
      <div className="text-center pb-3 border-b-2 border-indigo-500">
        <p className="text-lg font-bold text-indigo-900 dark:text-indigo-300">{instituteName}</p>
        {instituteAddress && <p className="text-xs text-gray-500">{instituteAddress}</p>}
        {institutePhone && <p className="text-xs text-gray-500">Ph: {institutePhone}</p>}
      </div>

      <div className="flex items-start justify-between">
        <p className="text-base font-bold text-indigo-600 dark:text-indigo-400">FEE RECEIPT</p>
        <div className="text-right space-y-0.5">
          <p className="text-xs text-gray-500">Receipt No</p>
          <p className="font-mono font-bold text-gray-900 dark:text-white text-xs">{receiptNo}</p>
          <p className="text-xs text-gray-400">{receiptDate}</p>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 space-y-1">
        <div className="flex justify-between">
          <span className="text-gray-500">Student</span>
          <span className="font-semibold text-gray-900 dark:text-white">{studentName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Class</span>
          <span className="text-gray-700 dark:text-gray-300">{studentClass}</span>
        </div>
        {rollNumber !== '-' && (
          <div className="flex justify-between">
            <span className="text-gray-500">Roll No</span>
            <span className="text-gray-700 dark:text-gray-300">{rollNumber}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-500">Payment Mode</span>
          <span className="text-gray-700 dark:text-gray-300">{paymentMode}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Installment #</span>
          <span className="text-gray-700 dark:text-gray-300">{installmentNumber}</span>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center">
        <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mb-1">Amount Paid</p>
        <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{fmt(amount)}</p>
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Receipt Particulars
        </div>
        <div className="grid grid-cols-[56px_1fr_96px] text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200 dark:border-gray-700">
          <div className="px-3 py-2">Sr.</div>
          <div className="px-3 py-2">Particular</div>
          <div className="px-3 py-2 text-right">Amount</div>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {particulars.map((item, index) => (
            <div key={item.key} className="grid grid-cols-[56px_1fr_96px] text-sm">
              <div className="px-3 py-2.5 font-mono text-gray-500">{String(index + 1).padStart(2, '0')}</div>
              <div className="px-3 py-2.5 text-gray-900 dark:text-white">{item.label}</div>
              <div className="px-3 py-2.5 text-right font-medium text-gray-700 dark:text-gray-300">
                {formatReceiptParticularAmount(particularAmounts[item.key])}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[56px_1fr_96px] border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 text-sm font-semibold">
          <div className="px-3 py-2.5 text-transparent">--</div>
          <div className="px-3 py-2.5 text-gray-900 dark:text-white">Total</div>
          <div className="px-3 py-2.5 text-right text-gray-900 dark:text-white">{fmt(totalFee)}</div>
        </div>
      </div>

      {previousInstallments.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Previous Installments</p>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {previousInstallments.map((item, index) => (
              <div key={index} className="flex items-center justify-between px-3 py-2 text-xs bg-white dark:bg-gray-900">
                <span className="font-mono text-gray-500">{item.receiptNumber ?? '-'}</span>
                <span className="text-gray-500">{fmtDate(item.date)}</span>
                <span className="text-gray-500">{item.paymentMode ?? 'Cash'}</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{fmt(item.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Fee Summary
        </div>
        <div className="px-3 py-1 divide-y divide-gray-100 dark:divide-gray-800">
          <Row label="Total Fee" value={fmt(totalFee)} />
          {discount > 0 && (
            <Row
              label="Discount"
              value={`- ${fmt(discount)}`}
              valueClass="text-green-600 dark:text-green-400"
            />
          )}
          <Row label="Total Paid" value={fmt(totalPaid)} valueClass="text-blue-600 dark:text-blue-400" />
          <Row
            label="Balance Due"
            value={isPaid ? 'FULLY PAID' : fmt(remaining)}
            valueClass={isPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
          />
        </div>
      </div>

      <div className="flex justify-between pt-4 border-t border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-400">
        <div className="text-center">
          <div className="h-8 border-b border-gray-300 dark:border-gray-600 mb-1 w-28" />
          <span>Received by</span>
        </div>
        <div className="text-center">
          <div className="h-8 border-b border-gray-300 dark:border-gray-600 mb-1 w-28" />
          <span>Authorized Signatory</span>
        </div>
      </div>

      <p className="text-center text-xs text-gray-300 dark:text-gray-600">
        Computer-generated receipt. No physical signature required
      </p>
    </div>
  )
}

export default function ReceiptPreview({
  data,
  onClose,
  onDownload,
  onWhatsApp,
  isGenerating,
}) {
  if (!data) return null

  const studentName = data?.student?.dynamicFields?.studentName ?? 'Student'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Receipt Preview</h3>
          <p className="text-xs text-gray-400 truncate">{studentName}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onDownload}
            disabled={isGenerating}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
              isGenerating
                ? 'bg-indigo-300 dark:bg-indigo-900 text-white cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            )}
          >
            {isGenerating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing...</>
              : <><Download className="w-4 h-4" /> Download PDF</>}
          </button>

          <button
            onClick={onWhatsApp}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-green-500 hover:bg-green-600 text-white transition-colors"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div style={{ width: '100%', maxWidth: 520 }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden p-5">
            <LegacyReceiptCard data={data} />
          </div>
        </div>
      </div>
    </div>
  )
}
