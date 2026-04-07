/**
 * Receipts.jsx
 *
 * Lists all fee receipts for the selected institute.
 * Features:
 *  - Search by receipt number or student name
 *  - Date range filter
 *  - Download PDF (generated in Web Worker — no UI freeze)
 *  - WhatsApp share with pre-filled message
 *  - Receipt preview modal
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Receipt, Search, Download, MessageCircle, Printer,
  RefreshCw, Eye, Loader2, Calendar,
  CheckCircle, X, Filter,
} from 'lucide-react'
import useReceiptStore from '../store/useReceiptStore'
import useStudentStore from '../store/useStudentStore'
import useAppStore     from '../store/useAppStore'
import ReceiptPreview  from '../components/ReceiptPreview'
import DocumentRenderer from '../components/DocumentRenderer'
import usePrintDocument from '../hooks/usePrintDocument'
import { getActiveTemplate, getFields, getSettings } from '../utils/dbHelpers'
import { getPageSizeConfig } from '../utils/pageSizes'
import { buildReceiptTemplateSettings, buildReceiptTemplateStudent } from '../utils/receiptTemplateData'
import clsx            from 'clsx'
import '../styles/print.css'

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`

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

// ── PDF Worker singleton (one worker reused across the page) ──────────────

let _worker = null
const _pending = new Map() // jobId → { resolve, reject }

function getWorker() {
  if (_worker) return _worker
  _worker = new Worker(
    new URL('../workers/pdfWorker.js', import.meta.url),
    { type: 'module' }
  )
  _worker.onmessage = (e) => {
    const { type, id, buffer, error } = e.data ?? {}
    const handlers = _pending.get(id)
    if (!handlers) return
    _pending.delete(id)
    if (type === 'PDF_READY') handlers.resolve(buffer)
    else handlers.reject(new Error(error ?? 'Unknown PDF error'))
  }
  _worker.onerror = () => {
    _worker?.terminate()
    _worker = null
    _pending.forEach(({ reject }) => reject(new Error('Worker crashed')))
    _pending.clear()
  }
  return _worker
}

/** Send a job to the Web Worker; returns a Promise<ArrayBuffer> */
function workerPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const worker = getWorker()
      const id = crypto.randomUUID()
      _pending.set(id, { resolve, reject })
      worker.postMessage({ type: 'GENERATE_PDF', id, data })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * Generate a PDF ArrayBuffer.
 * Tries the Web Worker first; on any failure falls back to main-thread generation.
 * pdfmake 0.3.x API: virtualfs + async getBlob()
 */
async function generatePDF(data) {
  try {
    return await workerPDF(data)
  } catch (workerErr) {
    console.warn('Worker PDF failed, falling back to main thread:', workerErr.message)
    return mainThreadPDF(data)
  }
}

/** Main-thread fallback — uses pdfmake 0.3.x API (virtualfs + async getBlob) */
async function mainThreadPDF(data) {
  const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  // pdfmake 0.3.x: virtualfs replaces the old pdfMake.vfs
  // readFileSync must return Uint8Array — raw base64 string would be treated as a path
  pdfMake.virtualfs = {
    existsSync:   (path) => Object.prototype.hasOwnProperty.call(pdfFonts, path),
    readFileSync: (path) => {
      const b64    = pdfFonts[path]
      const binary = atob(b64)
      const bytes  = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return bytes
    },
  }
  const { buildReceiptDocDef } = await import('../utils/pdfGenerator')
  // getBlob() is async in 0.3.x — returns Promise<Blob>
  const blob = await pdfMake.createPdf(buildReceiptDocDef(data)).getBlob()
  return blob.arrayBuffer()
}

function downloadBuffer(buffer, filename) {
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url  = URL.createObjectURL(blob)
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

// ── Page Component ─────────────────────────────────────────────────────────

export default function Receipts() {
  const { currentInstituteId, currentInstituteName, selectedInstitute } = useAppStore()
  const { print } = usePrintDocument()
  const institutes = []
  const {
    receipts, loading, pdfStatus,
    loadReceipts, getReceiptData, setPdfStatus,
  } = useReceiptStore()

  const [search,      setSearch]      = useState('')
  const [dateFrom,    setDateFrom]    = useState('')
  const [dateTo,      setDateTo]      = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [preview,     setPreview]     = useState(null)
  const [toast,       setToast]       = useState(null)
  const [receiptTemplate, setReceiptTemplate] = useState(null)
  const [receiptFields, setReceiptFields]     = useState([])
  const [receiptSettings, setReceiptSettings] = useState(null)
  const [printJob, setPrintJob]               = useState(null)

  const instituteId = currentInstituteId || selectedInstitute || null
  const institute   = { name: currentInstituteName, address: '', phone: '', logo: null }
  const { widthMm: printPageWidth, heightMm: printPageHeight } = getPageSizeConfig(receiptTemplate?.pageSize ?? 'A4')

  const loadReceiptAssets = useCallback(async () => {
    if (!instituteId) {
      setReceiptTemplate(null)
      setReceiptFields([])
      setReceiptSettings(null)
      return
    }

    try {
      const [template, fields, settings] = await Promise.all([
        getActiveTemplate(instituteId, 'receipt'),
        getFields(instituteId),
        getSettings(instituteId),
      ])
      setReceiptTemplate(template)
      setReceiptFields(fields)
      setReceiptSettings(settings)
    } catch (err) {
      console.error('Receipt template assets load failed:', err)
      setReceiptTemplate(null)
      setReceiptFields([])
      setReceiptSettings(null)
    }
  }, [instituteId])

  useEffect(() => {
    if (instituteId) loadReceipts(instituteId)
  }, [instituteId, loadReceipts])

  useEffect(() => {
    loadReceiptAssets()
  }, [loadReceiptAssets])

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  // ── Filtered list ──────────────────────────────────────────────────────

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase()
    return receipts.filter(r => {
      if (q) {
        const name = (r.student?.dynamicFields?.studentName ?? '').toLowerCase()
        const rno  = (r.receiptNumber ?? '').toLowerCase()
        if (!name.includes(q) && !rno.includes(q)) return false
      }
      if (dateFrom && r.paymentDate && r.paymentDate < dateFrom) return false
      if (dateTo   && r.paymentDate && r.paymentDate > dateTo)   return false
      return true
    })
  }, [receipts, search, dateFrom, dateTo])

  // ── Enrich data with institute info ────────────────────────────────────

  const enrichInstitute = useCallback((data) => ({
    ...data,
    institute: {
      ...data?.institute,
      name:    receiptSettings?.schoolName ?? institute?.name ?? data?.institute?.name ?? 'School',
      address: receiptSettings?.address ?? institute?.address ?? data?.institute?.address ?? '',
      phone:   receiptSettings?.phone ?? institute?.phone ?? data?.institute?.phone ?? '',
      logo:    receiptSettings?.logo ?? data?.institute?.logo ?? null,
    },
  }), [institute, receiptSettings])

  const hasTemplateReceiptFlow = Boolean(receiptTemplate && receiptFields.length)

  const buildTemplatePayload = useCallback((data) => ({
    student: buildReceiptTemplateStudent(data),
    settings: buildReceiptTemplateSettings({
      ...data?.institute,
      ...receiptSettings,
    }),
  }), [receiptSettings])

  // ── PDF Download ───────────────────────────────────────────────────────

  const handleDownload = useCallback(async (receiptId, receiptNumber, preloadedData = null) => {
    const raw = preloadedData ?? await getReceiptData(receiptId)
    if (!raw) { showToast('Receipt data not found', 'error'); return }
    const data = enrichInstitute(raw)

    if (hasTemplateReceiptFlow) {
      const templatePayload = buildTemplatePayload(data)
      setPdfStatus(receiptId, 'generating')
      setPrintJob({
        receiptId,
        receiptNumber,
        student: templatePayload.student,
        settings: templatePayload.settings,
      })
      return
    }

    setPdfStatus(receiptId, 'generating')
    try {
      const buffer = await generatePDF(data)
      downloadBuffer(buffer, `Receipt-${receiptNumber ?? receiptId}.pdf`)
      setPdfStatus(receiptId, 'done')
      showToast(`Receipt ${receiptNumber} downloaded`)
    } catch (err) {
      console.error('PDF generation error:', err)
      setPdfStatus(receiptId, 'error')
      showToast('PDF generation failed. Please try again.', 'error')
    }
  }, [buildTemplatePayload, enrichInstitute, getReceiptData, hasTemplateReceiptFlow, setPdfStatus, showToast])

  // ── WhatsApp Share ─────────────────────────────────────────────────────

  const handleWhatsApp = useCallback((data) => {
    const { receipt, student } = data
    const studentName = student?.dynamicFields?.studentName ?? 'Student'
    const msg = encodeURIComponent(
      `*Fee Receipt*\n` +
      `Receipt No: ${receipt?.receiptNumber ?? '-'}\n` +
      `Student: ${studentName}\n` +
      `Amount Paid: ${fmt(receipt?.amount)}\n` +
      `Date: ${fmtDate(receipt?.paymentDate ?? receipt?.createdAt)}\n` +
      `School: ${institute?.name ?? 'School'}\n\n` +
      `_This is a computer-generated receipt._`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener,noreferrer')
  }, [institute])

  // ── Preview ────────────────────────────────────────────────────────────

  const handlePreview = useCallback(async (receipt) => {
    const raw = await getReceiptData(receipt.id)
    if (!raw) { showToast('Could not load receipt details', 'error'); return }
    const data = enrichInstitute(raw)
    const templatePayload = hasTemplateReceiptFlow ? buildTemplatePayload(data) : null
    setPreview({
      data,
      student: templatePayload?.student ?? null,
      settings: templatePayload?.settings ?? null,
    })
  }, [buildTemplatePayload, enrichInstitute, getReceiptData, hasTemplateReceiptFlow, showToast])

  useEffect(() => {
    if (!printJob) return

    let frame1 = 0
    let frame2 = 0

    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        try {
          print()
          setPdfStatus(printJob.receiptId, 'done')
          showToast(`Receipt ${printJob.receiptNumber} ready. Print dialog मधून Save as PDF करा.`)
        } catch (err) {
          console.error('Receipt print error:', err)
          setPdfStatus(printJob.receiptId, 'error')
          showToast('Print dialog open झाला नाही. पुन्हा प्रयत्न करा.', 'error')
        } finally {
          setPrintJob(null)
        }
      })
    })

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [print, printJob, setPdfStatus, showToast])

  // ── Render ─────────────────────────────────────────────────────────────

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

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Receipts</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displayed.length} of {receipts.length} receipts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(p => !p)}
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
              loadReceiptAssets()
            }}
            className="btn-secondary p-2"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Search + Date Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by student name or receipt number…"
            className="input pl-9"
          />
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date" value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="date" value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="btn-secondary px-3 text-sm shrink-0 flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Receipts Table */}
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
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
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
                displayed.map(r => {
                  const studentName = r.student?.dynamicFields?.studentName ?? 'Unknown'
                  const isGen       = pdfStatus[r.id] === 'generating'

                  return (
                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">

                      {/* Receipt No */}
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'font-mono text-xs font-semibold px-2 py-0.5 rounded-lg',
                          r.status === 'cancelled'
                            ? 'bg-red-50 dark:bg-red-900/20 text-red-500 line-through'
                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                        )}>
                          {r.receiptNumber}
                        </span>
                      </td>

                      {/* Student */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-green-700 dark:text-green-400">
                              {studentName[0] ?? '?'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{studentName}</p>
                            {r.student?.class && (
                              <p className="text-xs text-gray-400">Class {r.student.class}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="px-4 py-3 text-right font-bold text-green-600 dark:text-green-400">
                        {fmt(r.amount)}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell text-sm">
                        {fmtDate(r.paymentDate ?? r.createdAt)}
                      </td>

                      {/* Mode */}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          {r.paymentMode ?? 'Cash'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePreview(r)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary-600 transition-colors"
                            title="Preview receipt"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownload(r.id, r.receiptNumber, null)}
                            disabled={isGen}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
                            title={hasTemplateReceiptFlow ? 'Print / Save PDF' : 'Download PDF'}
                          >
                            {isGen
                              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                              : hasTemplateReceiptFlow
                                ? <Printer className="w-3.5 h-3.5" />
                                : <Download className="w-3.5 h-3.5" />
                            }
                          </button>

                          <button
                            onClick={async () => {
                              const raw = await getReceiptData(r.id)
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
                              if (!confirm(`Cancel receipt ${r.receiptNumber}?`)) return
                              try {
                                const { cancelReceipt } = useStudentStore.getState()
                                await cancelReceipt(r.id, reason)
                                loadReceipts(instituteId)
                                showToast(`Receipt ${r.receiptNumber} cancelled`)
                              } catch (err) {
                                showToast(err.message, 'error')
                              }
                            }}
                            disabled={r.status === 'cancelled'}
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
              Total collected: {fmt(displayed.reduce((s, r) => s + Number(r.amount ?? 0), 0))}
            </span>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <ReceiptPreview
          data={preview.data}
          template={receiptTemplate}
          fields={receiptFields}
          student={preview.student}
          settings={preview.settings}
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

      {printJob && hasTemplateReceiptFlow && (
        <div
          className="doc-print-root"
          style={{ '--print-page-width': printPageWidth, '--print-page-height': printPageHeight }}
        >
          <DocumentRenderer
            template={receiptTemplate}
            fields={receiptFields}
            student={printJob.student}
            settings={printJob.settings}
            mode="print"
            pageSize={receiptTemplate?.pageSize ?? 'A4'}
          />
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
        )}>
          <CheckCircle className="w-4 h-4 text-green-400 dark:text-green-600" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
