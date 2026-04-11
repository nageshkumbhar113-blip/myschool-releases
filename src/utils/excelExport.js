/**
 * excelExport.js
 *
 * SheetJS-based Excel export utility.
 *
 * Produces a .xlsx file with two sheets:
 *   1. "Summary"  — key totals / metadata
 *   2. "Detailed" — full data rows from the report
 *
 * Features:
 *   - Auto column width (fits longest value in each column)
 *   - Bold, styled header row
 *   - Currency columns right-aligned (via cell type 'n')
 *   - Filename: Report-{type}-{YYYY-MM-DD}.xlsx
 */

import * as XLSX from 'xlsx'

// ── Column width helper ────────────────────────────────────────────────────

/**
 * Calculate optimal column widths by scanning all values including the header.
 * Returns an array of { wch: number } objects.
 */
function autoColWidths(headers, rows) {
  return headers.map((h) => {
    const header  = String(h ?? '').length
    const maxData = rows.reduce((m, row) => {
      const val = String(row[h] ?? '')
      return Math.max(m, val.length)
    }, 0)
    return { wch: Math.min(Math.max(header, maxData) + 2, 40) }
  })
}

// ── Sheet builder ──────────────────────────────────────────────────────────

/**
 * Build a worksheet from an array of row objects.
 * The first row is treated as a bold header.
 *
 * @param {string[]} headers   — column names in display order
 * @param {object[]} rows      — array of { [header]: value }
 * @returns {XLSX.WorkSheet}
 */
function buildSheet(headers, rows) {
  // ── Prepare AOA (array of arrays) ──────────────────────────────────────
  const aoa = [headers, ...rows.map(row => headers.map(h => row[h] ?? ''))]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // ── Auto column widths ─────────────────────────────────────────────────
  ws['!cols'] = autoColWidths(headers, rows)

  // ── Bold header row ────────────────────────────────────────────────────
  const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1')
  for (let C = range.s.c; C <= range.e.c; C++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: C })
    if (!ws[cellRef]) continue
    ws[cellRef].s = {
      font:      { bold: true, color: { rgb: 'FFFFFF' } },
      fill:      { patternType: 'solid', fgColor: { rgb: '4F46E5' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        bottom: { style: 'thin', color: { rgb: 'C7D2FE' } },
      },
    }
  }

  // ── Freeze header row ──────────────────────────────────────────────────
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  return ws
}

// ── Summary sheet builder ──────────────────────────────────────────────────

function buildSummarySheet(meta) {
  const rows = Object.entries(meta).map(([k, v]) => [k, v])
  const ws = XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...rows])
  ws['!cols'] = [{ wch: 28 }, { wch: 22 }]

  // Bold header
  ;['A1', 'B1'].forEach(ref => {
    if (!ws[ref]) return
    ws[ref].s = {
      font: { bold: true },
      fill: { patternType: 'solid', fgColor: { rgb: 'E0E7FF' } },
    }
  })
  return ws
}

// ── Date helpers ──────────────────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ── Report type → display name ────────────────────────────────────────────

const REPORT_LABELS = {
  student:    'Student-Report',
  collection: 'Fee-Collection',
  pending:    'Pending-Fees',
  classwise:  'Class-Wise',
  register:   'Receipt-Register',
}

function formatSummaryLabel(key) {
  if (key === 'resistorNo') return 'Reg. No.'
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
}

// ── Main export function ──────────────────────────────────────────────────

/**
 * Export a report to .xlsx and trigger a browser download.
 *
 * @param {object} opts
 * @param {string}   opts.reportType       — one of REPORT_LABELS keys
 * @param {string}   opts.instituteName    — appears in the summary
 * @param {object}   opts.filters          — active filter values (for summary)
 * @param {string[]} opts.headers          — column headers for Detailed sheet
 * @param {object[]} opts.allRows          — ALL rows (not just current page)
 * @param {object}   [opts.summary]        — key-value totals for Summary sheet
 */
export function exportToExcel({
  reportType,
  instituteName,
  filters = {},
  headers,
  allRows,
  summary = {},
}) {
  const wb = XLSX.utils.book_new()

  // ── Summary sheet ──────────────────────────────────────────────────────
  const summaryData = {
    'Report Type':      REPORT_LABELS[reportType] ?? reportType,
    'Institute':        instituteName ?? '',
    'Generated On':     new Date().toLocaleString('en-IN'),
    'Total Records':    allRows.length,
    ...(filters.academicYear ? { 'Academic Year': filters.academicYear } : {}),
    ...(filters.class        ? { 'Class':         filters.class }        : {}),
    ...(filters.dateFrom     ? { 'Date From':     filters.dateFrom }     : {}),
    ...(filters.dateTo       ? { 'Date To':       filters.dateTo }       : {}),
    ...Object.fromEntries(
      Object.entries(summary).map(([k, v]) => [
        formatSummaryLabel(k),
        typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : v,
      ])
    ),
  }
  const summaryWs = buildSummarySheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary')

  // ── Detailed sheet ────────────────────────────────────────────────────
  const detailedWs = buildSheet(headers, allRows)
  XLSX.utils.book_append_sheet(wb, detailedWs, 'Detailed')

  // ── Trigger download ──────────────────────────────────────────────────
  const label    = REPORT_LABELS[reportType] ?? reportType
  const filename = `Report-${label}-${todayStr()}.xlsx`

  XLSX.writeFile(wb, filename)
}

/**
 * Export a quick single-sheet file (for simple use cases).
 */
export function exportSimple(rows, filename) {
  if (!rows?.length) return
  const wb   = XLSX.utils.book_new()
  const ws   = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  XLSX.writeFile(wb, filename ?? `export-${todayStr()}.xlsx`)
}
