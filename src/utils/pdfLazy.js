/**
 * pdfLazy.js
 *
 * Main-thread utility to interact with pdfWorker lazily.
 *
 * WHY THIS FILE EXISTS:
 *   Instead of each page creating its own Worker, this module provides
 *   a single shared worker instance + a clean Promise-based API.
 *   Worker is created only when first PDF is requested — not on app load.
 *
 * Usage:
 *   import { generateReceiptPdf, generateLCPdf } from '../utils/pdfLazy'
 *
 *   // Returns a Blob URL you can open/download
 *   const url = await generateReceiptPdf({ institute, student, receipt, fee })
 *   window.open(url)
 *
 *   // LC
 *   const url = await generateLCPdf({ settings, student, template, fields })
 */

// ── Worker singleton ───────────────────────────────────────────────────────

let _worker   = null
let _pending  = new Map()   // id → { resolve, reject }
let _idCounter = 0
let _libsLoading = false     // true while pdfmake is loading for the first time

function getWorker() {
  if (_worker) return _worker

  // Worker is created lazily — Vite handles the ?worker import
  _worker = new Worker(
    new URL('../workers/pdfWorker.js', import.meta.url),
    { type: 'module' }
  )

  _worker.onmessage = (event) => {
    const { type, id, buffer, error } = event.data ?? {}

    if (type === 'PDF_LOADING') {
      _libsLoading = true
      return
    }

    const pending = _pending.get(id)
    if (!pending) return

    _pending.delete(id)
    _libsLoading = false

    if (type === 'PDF_READY') {
      // Convert ArrayBuffer → Blob → Object URL
      const blob = new Blob([buffer], { type: 'application/pdf' })
      const url  = URL.createObjectURL(blob)
      pending.resolve(url)
    } else {
      pending.reject(new Error(error ?? 'PDF generation failed'))
    }
  }

  _worker.onerror = (err) => {
    // Reject all pending if worker crashes
    for (const [, { reject }] of _pending) {
      reject(new Error(err.message ?? 'Worker error'))
    }
    _pending.clear()
    _worker = null   // will be recreated on next call
  }

  return _worker
}

// ── Core generator ─────────────────────────────────────────────────────────

/**
 * Send a PDF job to the worker and return a Promise<blobUrl>.
 * @param {'receipt'|'lc'} docType
 * @param {object} data
 * @param {object} [options]
 * @param {(isLoading: boolean) => void} [options.onLoadingChange]
 *   Called with true when PDF libs are loading for the first time,
 *   false when done. Use this to show a loading indicator.
 * @returns {Promise<string>} Object URL — call URL.revokeObjectURL() when done
 */
function generatePdf(docType, data, options = {}) {
  return new Promise((resolve, reject) => {
    const id = String(++_idCounter)
    _pending.set(id, { resolve, reject })

    const worker = getWorker()

    // Notify caller if libs are being loaded for first time
    if (options.onLoadingChange) {
      // Check after a tick — worker posts PDF_LOADING asynchronously
      setTimeout(() => {
        if (_libsLoading) options.onLoadingChange(true)
      }, 50)
    }

    worker.postMessage({ type: 'GENERATE_PDF', id, docType, data })
  }).finally(() => {
    options.onLoadingChange?.(false)
  })
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a receipt PDF.
 * @param {{ institute, student, receipt, fee }} data
 * @param {object} [options]
 * @returns {Promise<string>} blobUrl
 */
export function generateReceiptPdf(data, options = {}) {
  return generatePdf('receipt', data, options)
}

/**
 * Generate an LC / certificate PDF.
 * @param {{ settings, student, template, fields }} data
 * @param {object} [options]
 * @returns {Promise<string>} blobUrl
 */
export function generateLCPdf(data, options = {}) {
  return generatePdf('lc', data, options)
}

/**
 * Pre-warm the PDF worker in the background (optional).
 * Call this after the main UI has loaded to reduce first-PDF latency.
 * Does NOT block the UI.
 *
 * Usage: call this from Dashboard.jsx after initial render.
 *   import { prewarmPdfWorker } from '../utils/pdfLazy'
 *   useEffect(() => { prewarmPdfWorker() }, [])
 */
export function prewarmPdfWorker() {
  // Just creating the worker starts the module load in background
  requestIdleCallback
    ? requestIdleCallback(() => getWorker(), { timeout: 3000 })
    : setTimeout(() => getWorker(), 2000)
}

/**
 * Revoke a previously generated blob URL to free memory.
 * Call this after the PDF tab/download is no longer needed.
 * @param {string} url
 */
export function revokePdfUrl(url) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}