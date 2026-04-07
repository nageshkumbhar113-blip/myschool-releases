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
  const print = useCallback(() => {
    window.print()
  }, [])

  return { print }
}
