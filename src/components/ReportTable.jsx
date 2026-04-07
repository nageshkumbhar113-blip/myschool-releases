/**
 * ReportTable.jsx
 *
 * Generic paginated data table for all report types.
 *
 * Props:
 *   headers    — string[]        column names (in order)
 *   rows       — object[]        current page rows
 *   total      — number          total matching records
 *   page       — number          current page (1-based)
 *   pages      — number          total pages
 *   pageSize   — number
 *   onPage     — (n) => void
 *   loading    — bool
 *   emptyText  — string
 */

import React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import clsx from 'clsx'

// Columns that should be right-aligned (numeric / currency)
const RIGHT_ALIGN_PATTERNS = [
  /amount/i, /fee/i, /paid/i, /pending/i, /balance/i, /collected/i,
  /remaining/i, /total/i, /discount/i, /students/i, /%/,
  /^#$/, /installments/i,
]

function isRightAligned(header) {
  return RIGHT_ALIGN_PATTERNS.some(p => p.test(header))
}

// Columns that get a colored badge
function getStatusBadge(header, value) {
  if (header !== 'Status' && header !== 'Fee Status') return null
  const map = {
    paid:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    partial:  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    overdue:  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    pending:  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
    active:   'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    inactive: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400',
    transferred: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    graduated:   'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  }
  return map[String(value).toLowerCase()] ?? null
}

function CurrencyCell({ value }) {
  const n = Number(value)
  if (isNaN(n) || value === '') return <span className="text-gray-400">—</span>
  return (
    <span className={clsx('font-mono text-xs', n === 0 ? 'text-gray-400' : 'text-gray-900 dark:text-white')}>
      {n > 0 ? `₹${n.toLocaleString('en-IN')}` : '—'}
    </span>
  )
}

function PageButton({ onClick, disabled, active, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors',
        active
          ? 'bg-primary-600 text-white font-semibold'
          : disabled
            ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
      )}
    >
      {children}
    </button>
  )
}

export default function ReportTable({
  headers = [],
  rows = [],
  total = 0,
  page = 1,
  pages = 1,
  pageSize = 50,
  onPage,
  loading,
  emptyText = 'No data found',
}) {
  const isCurrencyCol = (h) => /₹|amount|fee|paid|pending|balance|collected|remaining|total|discount/i.test(h)

  // Visible page numbers (max 5 around current)
  const pageNums = () => {
    const arr = []
    const lo = Math.max(1, page - 2)
    const hi = Math.min(pages, page + 2)
    for (let i = lo; i <= hi; i++) arr.push(i)
    return arr
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      {/* Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/60 sticky top-0 z-10">
            <tr>
              {headers.map(h => (
                <th
                  key={h}
                  className={clsx(
                    'px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 whitespace-nowrap border-b border-gray-200 dark:border-gray-700',
                    isRightAligned(h) ? 'text-right' : 'text-left'
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <tr key={i}>
                  {headers.map((_, j) => (
                    <td key={j} className="px-3 py-2.5">
                      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" style={{ width: `${60 + (j * 17) % 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-16 text-center text-gray-400 text-sm">
                  {emptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, ri) => (
                <tr
                  key={ri}
                  className={clsx(
                    'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                    ri % 2 === 0 ? '' : 'bg-gray-50/40 dark:bg-gray-800/20'
                  )}
                >
                  {headers.map(h => {
                    const val = row[h]
                    const badge = getStatusBadge(h, val)
                    const isNum = isCurrencyCol(h) && typeof val === 'number'
                    const right = isRightAligned(h)

                    return (
                      <td
                        key={h}
                        className={clsx(
                          'px-3 py-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap',
                          right ? 'text-right' : ''
                        )}
                      >
                        {badge ? (
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium capitalize', badge)}>
                            {val}
                          </span>
                        ) : isNum ? (
                          <CurrencyCell value={val} />
                        ) : (
                          <span>{val ?? '—'}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {(total > 0 || loading) && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 shrink-0">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {loading ? 'Loading…' : (
              <>
                Showing {Math.min((page - 1) * pageSize + 1, total)}–
                {Math.min(page * pageSize, total)} of <strong>{total}</strong>
              </>
            )}
          </p>

          {pages > 1 && (
            <div className="flex items-center gap-1">
              <PageButton onClick={() => onPage(1)}    disabled={page === 1}>
                <ChevronsLeft className="w-3.5 h-3.5" />
              </PageButton>
              <PageButton onClick={() => onPage(page - 1)} disabled={page === 1}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </PageButton>

              {pageNums().map(n => (
                <PageButton key={n} onClick={() => onPage(n)} active={n === page}>
                  {n}
                </PageButton>
              ))}

              <PageButton onClick={() => onPage(page + 1)} disabled={page === pages}>
                <ChevronRight className="w-3.5 h-3.5" />
              </PageButton>
              <PageButton onClick={() => onPage(pages)} disabled={page === pages}>
                <ChevronsRight className="w-3.5 h-3.5" />
              </PageButton>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
