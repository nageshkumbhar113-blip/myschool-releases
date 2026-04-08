/**
 * usePrintDocument.js
 *
 * Thin hook that triggers the browser print dialog.
 * Works in conjunction with print.css:
 *   - Caller renders DocumentRenderer in mode="print" inside .doc-print-root
 *   - print.css hides everything else and shows .doc-print-root during print
 *   - @page { size: A4; margin: 0 } fills the page exactly
 *
 * Usage:
 *   const { print } = usePrintDocument()
 *   <button onClick={print}>Print / Save as PDF</button>
 */

import { useCallback } from 'react'

export default function usePrintDocument() {
  const print = useCallback((pageSize = 'A4') => {
    const size = pageSize === 'A3' ? 'A3' : 'A4'
    const styleEl = document.createElement('style')
    styleEl.id = 'dynamic-print-page-size'
    styleEl.textContent = `@media print { @page { size: ${size} portrait; margin: 0; } }`
    document.head.appendChild(styleEl)

    const cleanup = () => styleEl.remove()
    window.addEventListener('afterprint', cleanup, { once: true })
    // fallback cleanup in case afterprint doesn't fire
    setTimeout(cleanup, 5000)

    window.print()
  }, [])

  return { print }
}
