/**
 * pdfWorker.js — Web Worker for PDF generation (pdfmake 0.3.x compatible)
 *
 * PERFORMANCE FIX:
 *   OLD: pdfmake + vfs_fonts imported at top-level → loaded on app start (~2.3MB)
 *   NEW: dynamic import inside onmessage → loaded only when PDF is first requested
 *        After first load, modules are cached by the browser automatically.
 *
 * Protocol:
 *   Main → Worker: { type: 'GENERATE_PDF', id, data, docType? }
 *                  docType: 'receipt' (default) | 'lc'
 *   Worker → Main: { type: 'PDF_READY', id, buffer: ArrayBuffer }  (transferable)
 *                  { type: 'PDF_ERROR', id, error: string }
 *                  { type: 'PDF_LOADING' }  — emitted once when first loading libs
 */

// ── Lazy module cache ──────────────────────────────────────────────────────
// Modules are loaded once and reused for all subsequent PDF requests.

let _pdfMakeReady = null  // Promise that resolves to configured pdfMake instance

function b64ToUint8Array(b64) {
  const binary = atob(b64)
  const bytes  = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/**
 * Load pdfmake + fonts lazily (only on first PDF request).
 * Returns a configured pdfMake instance.
 */
function getPdfMake() {
  if (_pdfMakeReady) return _pdfMakeReady

  // Notify main thread that we're loading PDF libs (for loading UI)
  self.postMessage({ type: 'PDF_LOADING' })

  _pdfMakeReady = (async () => {
    // Dynamic imports — Vite will code-split these into separate chunks
    const [{ default: pdfMake }, { default: pdfFonts }] = await Promise.all([
      import('pdfmake/build/pdfmake'),
      import('pdfmake/build/vfs_fonts'),
    ])

    // pdfmake 0.3.x virtualfs setup
    pdfMake.virtualfs = {
      existsSync:   (path) => Object.prototype.hasOwnProperty.call(pdfFonts, path),
      readFileSync: (path) => b64ToUint8Array(pdfFonts[path]),
    }

    return pdfMake
  })()

  return _pdfMakeReady
}

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = async (event) => {
  const { type, id, data, docType = 'receipt' } = event.data ?? {}
  if (type !== 'GENERATE_PDF') return

  try {
    // Load pdfmake lazily + correct doc builder in parallel
    const [pdfMake, docBuilderModule] = await Promise.all([
      getPdfMake(),
      docType === 'lc'
        ? import('../utils/lcPdfGenerator')
        : import('../utils/pdfGenerator'),
    ])

    const buildFn = docType === 'lc'
      ? docBuilderModule.buildLCDocDef
      : docBuilderModule.buildReceiptDocDef

    const docDef = buildFn(data)
    const blob   = await pdfMake.createPdf(docDef).getBlob()
    const buffer = await blob.arrayBuffer()

    // Transfer the buffer (zero-copy)
    self.postMessage({ type: 'PDF_READY', id, buffer }, [buffer])

  } catch (err) {
    self.postMessage({
      type:  'PDF_ERROR',
      id,
      error: err?.message ?? 'PDF generation failed',
    })
  }
}