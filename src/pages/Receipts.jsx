/**
 * Receipts.jsx
 *
 * Lists all fee receipts for the selected institute.
 * Features:
 *  - Search by receipt number or student name
 *  - Date range filter
 *  - Direct PDF download
 *  - WhatsApp share with pre-filled message
 *  - Receipt preview modal
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Receipt, Search, Download, MessageCircle,
  RefreshCw, Eye, Loader2, Calendar,
  CheckCircle, X, Filter,
} from 'lucide-react'
import clsx from 'clsx'
import useReceiptStore from '../store/useReceiptStore'
import useStudentStore from '../store/useStudentStore'
import useAppStore from '../store/useAppStore'
import ReceiptPreview from '../components/ReceiptPreview'
import { getSettings } from '../utils/dbHelpers'

const fmt = (n) => `Rs.${Number(n ?? 0).toLocaleString('en-IN')}`

const fmtDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

let workerInstance = null
const pendingJobs = new Map()

function getWorker() {
  if (workerInstance) return workerInstance

  workerInstance = new Worker(
    new URL('../workers/pdfWorker.js', import.meta.url),
    { type: 'module' }
  )

  workerInstance.onmessage = (event) => {
    const { type, id, buffer, error } = event.data ?? {}
    const handlers = pendingJobs.get(id)
    if (!handlers) return

    pendingJobs.delete(id)
    if (type === 'PDF_READY') handlers.resolve(buffer)
    else handlers.reject(new Error(error ?? 'Unknown PDF error'))
  }

  workerInstance.onerror = () => {
    workerInstance?.terminate()
    workerInstance = null
    pendingJobs.forEach(({ reject }) => reject(new Error('Worker crashed')))
    pendingJobs.clear()
  }

  return workerInstance
}

function workerPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const worker = getWorker()
      const id = crypto.randomUUID()
      pendingJobs.set(id, { resolve, reject })
      worker.postMessage({ type: 'GENERATE_PDF', id, data })
    } catch (error) {
      reject(error)
    }
  })
}

async function mainThreadPDF(data) {
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])

  pdfMake.virtualfs = {
    existsSync: (path) => Object.prototype.hasOwnProperty.call(pdfFonts, path),
    readFileSync: (path) => {
      const base64 = pdfFonts[path]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    },
  }

  const { buildReceiptDocDef } = await import('../utils/pdfGenerator')
  const blob = await pdfMake.createPdf(buildReceiptDocDef(data)).getBlob()
  return blob.arrayBuffer()
}

async function generatePDF(data) {
  try {
    return await workerPDF(data)
  } catch (workerError) {
    console.warn('Worker PDF failed, falling back to main thread:', workerError.message)
    return mainThreadPDF(data)
  }
}

function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const anchor = Object.assign(document.createElement('a'), {
    href: url,
    download: filename,
  })

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export default function Receipts() {
  const { currentInstituteId, currentInstituteName, selectedInstitute } = useAppStore()
  const {
    receipts, loading, pdfStatus,
    loadReceipts, getReceiptData, setPdfStatus,
  } = useReceiptStore()

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [preview, setPreview] = useState(null)
  const [toast, setToast] = useState(null)
  const [receiptSettings, setReceiptSettings] = useState(null)

  const instituteId = currentInstituteId || selectedInstitute || null
  const institute = { name: currentInstituteName, address: '', phone: '', logo: null }

  const loadReceiptSettings = useCallback(async () => {
    if (!instituteId) {
      setReceiptSettings(null)
      return
    }

    try {
      const settings = await getSettings(instituteId)
      setReceiptSettings(settings)
    } catch (error) {
      console.error('Receipt settings load failed:', error)
      setReceiptSettings(null)
    }
  }, [instituteId])

  useEffect(() => {
    if (instituteId) loadReceipts(instituteId)
  }, [instituteId, loadReceipts])

  useEffect(() => {
    loadReceiptSettings()
  }, [loadReceiptSettings])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const displayed = useMemo(() => {
    const query = search.trim().toLowerCase()

    return receipts.filter((receipt) => {
      if (query) {
        const name = (receipt.student?.dynamicFields?.studentName ?? '').toLowerCase()
        const number = (receipt.receiptNumber ?? '').toLowerCase()
        if (!name.includes(query) && !number.includes(query)) return false
      }

      if (dateFrom && receipt.paymentDate && receipt.paymentDate < dateFrom) return false
      if (dateTo && receipt.paymentDate && receipt.paymentDate > dateTo) return false
      return true
    })
  }, [receipts, search, dateFrom, dateTo])

  const enrichInstitute = useCallback((data) => ({
    ...data,
    institute: {
      ...data?.institute,
      name: receiptSettings?.schoolName ?? institute?.name ?? data?.institute?.name ?? 'School',
      address: receiptSettings?.address ?? institute?.address ?? data?.institute?.address ?? '',
      phone: receiptSettings?.phone ?? institute?.phone ?? data?.institute?.phone ?? '',
      logo: receiptSettings?.logo ?? data?.institute?.logo ?? null,
      feeStructure: receiptSettings?.feeStructure ?? data?.institute?.feeStructure ?? [],
    },
  }), [institute, receiptSettings])

  const handleDownload = useCallback(async (receiptId, receiptNumber, preloadedData = null) => {
    const raw = preloadedData ?? await getReceiptData(receiptId)
    if (!raw) {
      showToast('Receipt data not found', 'error')
      return
    }

    const data = enrichInstitute(raw)
    setPdfStatus(receiptId, 'generating')

    try {
      const buffer = await generatePDF(data)
      downloadBuffer(buffer, `Receipt-${receiptNumber ?? receiptId}.pdf`)
      setPdfStatus(receiptId, 'done')
      showToast(`Receipt ${receiptNumber} downloaded`)
    } catch (error) {
      console.error('PDF generation error:', error)
      setPdfStatus(receiptId, 'error')
      showToast('PDF generation failed. Please try again.', 'error')
    }
  }, [enrichInstitute, getReceiptData, setPdfStatus, showToast])

  const handleWhatsApp = useCallback((data) => {
    const { receipt, student } = data
    const studentName = student?.dynamicFields?.studentName ?? 'Student'
    const message = encodeURIComponent(
      `*Fee Receipt*\n`
      + `Receipt No: ${receipt?.receiptNumber ?? '-'}\n`
      + `Student: ${studentName}\n`
      + `Amount Paid: ${fmt(receipt?.amount)}\n`
      + `Date: ${fmtDate(receipt?.paymentDate ?? receipt?.createdAt)}\n`
      + `School: ${institute?.name ?? 'School'}\n\n`
      + `_This is a computer-generated receipt._`
    )

    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer')
  }, [institute])

  const handlePreview = useCallback(async (receipt) => {
    const raw = await getReceiptData(receipt.id)
    if (!raw) {
      showToast('Could not load receipt details', 'error')
      return
    }

    setPreview({ data: enrichInstitute(raw) })
  }, [enrichInstitute, getReceiptData, showToast])

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Receipt className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No institute found. Add one first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Receipts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displayed.length} of {receipts.length} receipts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters((prev) => !prev)}
            title="Date filter"
            className={clsx(
              'btn-secondary p-2',
              showFilters && 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            )}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (!instituteId) return
              loadReceipts(instituteId)
              loadReceiptSettings()
            }}
            className="btn-secondary p-2"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student name or receipt number..."
            className="input pl-9"
          />
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => {
                  setDateFrom('')
                  setDateTo('')
                }}
                className="btn-secondary px-3 text-sm shrink-0 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Receipt No</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Student</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden lg:table-cell">Mode</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 5 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 6 }).map((_, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                      <p className="text-gray-400 text-sm">
                        {receipts.length === 0
                          ? 'No receipts yet. Collect fees from the Fees page.'
                          : 'No receipts match your search.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                displayed.map((receipt) => {
                  const studentName = receipt.student?.dynamicFields?.studentName ?? 'Unknown'
                  const isGenerating = pdfStatus[receipt.id] === 'generating'

                  return (
                    <tr key={receipt.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            'font-mono text-xs font-semibold px-2 py-0.5 rounded-lg',
                            receipt.status === 'cancelled'
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-500 line-through'
                              : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                          )}
                        >
                          {receipt.receiptNumber}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-green-700 dark:text-green-400">
                              {studentName[0] ?? '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{studentName}</p>
                            {receipt.student?.class && (
                              <p className="text-xs text-gray-400">Class {receipt.student.class}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        {fmt(receipt.amount)}
                      </td>

                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell text-sm">
                        {fmtDate(receipt.paymentDate ?? receipt.createdAt)}
                      </td>

                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {receipt.paymentMode ?? 'Cash'}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePreview(receipt)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Preview receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(receipt.id, receipt.receiptNumber, null)}
                            disabled={isGenerating}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {isGenerating
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                              : <Download className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={async () => {
                              const raw = await getReceiptData(receipt.id)
                              if (raw) handleWhatsApp(enrichInstitute(raw))
                            }}
                            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600 transition-colors"
                            title="Share on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={async () => {
                              const reason = prompt('Cancel reason (optional):') ?? ''
                              if (!confirm(`Cancel receipt ${receipt.receiptNumber}?`)) return
                              try {
                                const { cancelReceipt } = useStudentStore.getState()
                                await cancelReceipt(receipt.id, reason)
                                loadReceipts(instituteId)
                                showToast(`Receipt ${receipt.receiptNumber} cancelled`)
                              } catch (error) {
                                showToast(error.message, 'error')
                              }
                            }}
                            disabled={receipt.status === 'cancelled'}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-30"
                            title="Cancel receipt"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {displayed.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{displayed.length} receipt{displayed.length !== 1 ? 's' : ''}</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              Total collected: {fmt(displayed.reduce((sum, receipt) => sum + Number(receipt.amount ?? 0), 0))}
            </span>
          </div>
        )}
      </div>

      {preview && (
        <ReceiptPreview
          data={preview.data}
          onClose={() => setPreview(null)}
          isGenerating={preview.data?.receipt?.id ? pdfStatus[preview.data.receipt.id] === 'generating' : false}
          onDownload={() => handleDownload(
            preview.data.receipt.id,
            preview.data.receipt.receiptNumber,
            preview.data
          )}
          onWhatsApp={() => handleWhatsApp(preview.data)}
        />
      )}

      {toast && (
        <div
          className={clsx(
            'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
          )}
        >
          <CheckCircle className="w-4 h-4 text-green-400 dark:text-green-600" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
