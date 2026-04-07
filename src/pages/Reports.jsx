/**
 * Reports.jsx
 *
 * Full-featured reports page with:
 *  - 5 report types (tabs)
 *  - Dynamic filters per report
 *  - Paginated table (50 rows/page)
 *  - Excel export (Summary + Detailed sheets)
 *  - Summary stats cards
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  BarChart3, Users, CreditCard, AlertCircle,
  FileText, RefreshCw, Download, Loader2,
} from 'lucide-react'
import useAppStore    from '../store/useAppStore'
import ReportFilters  from '../components/ReportFilters'
import ReportTable    from '../components/ReportTable'
import { runReport, getFilterOptions } from '../utils/reportQueries'
import { exportToExcel } from '../utils/excelExport'
import clsx from 'clsx'

// ── Report type config ────────────────────────────────────────────────────

const REPORT_TYPES = [
  {
    key:   'student',
    label: 'Students',
    icon:  Users,
    color: 'blue',
    desc:  'All students with fee status',
  },
  {
    key:   'collection',
    label: 'Fee Collection',
    icon:  CreditCard,
    color: 'green',
    desc:  'All collected payments by date',
  },
  {
    key:   'pending',
    label: 'Pending Fees',
    icon:  AlertCircle,
    color: 'red',
    desc:  'Students with outstanding dues',
  },
  {
    key:   'classwise',
    label: 'Class-wise',
    icon:  BarChart3,
    color: 'purple',
    desc:  'Aggregated totals per class',
  },
  {
    key:   'register',
    label: 'Receipt Register',
    icon:  FileText,
    color: 'indigo',
    desc:  'Full receipt ledger',
  },
]

const TYPE_COLOR = {
  blue:   'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  green:  'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
  red:    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
  purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800',
}

const PAGE_SIZE = 50

// ── Summary cards ─────────────────────────────────────────────────────────

function SummaryCards({ result, reportType }) {
  if (!result?.summary) return null
  const s = result.summary

  const cards = []
  const fmt = (n) => `₹${Number(n ?? 0).toLocaleString('en-IN')}`

  if (reportType === 'student') {
    cards.push({ label: 'Total Students', value: result.total, icon: Users, color: 'blue' })
  }
  if (reportType === 'collection') {
    cards.push({ label: 'Total Collected', value: fmt(s.totalCollected), icon: CreditCard, color: 'green' })
    cards.push({ label: 'Receipts',         value: s.receiptCount,       icon: FileText,   color: 'indigo' })
  }
  if (reportType === 'pending') {
    cards.push({ label: 'Students',      value: s.studentCount,         icon: Users,      color: 'red' })
    cards.push({ label: 'Total Pending', value: fmt(s.totalPending),    icon: AlertCircle,color: 'red' })
  }
  if (reportType === 'classwise') {
    cards.push({ label: 'Total Students',  value: s.totalStudents,          icon: Users,      color: 'blue' })
    cards.push({ label: 'Total Fee',       value: fmt(s.totalFee),          icon: CreditCard, color: 'green' })
    cards.push({ label: 'Total Collected', value: fmt(s.totalCollected),    icon: CreditCard, color: 'green' })
    cards.push({ label: 'Total Pending',   value: fmt(s.totalPending),      icon: AlertCircle,color: 'red' })
  }
  if (reportType === 'register') {
    cards.push({ label: 'Total Amount', value: fmt(s.totalAmount), icon: CreditCard, color: 'green' })
    cards.push({ label: 'Receipts',     value: s.count,            icon: FileText,   color: 'indigo' })
  }

  if (!cards.length) return null

  return (
    <div className={clsx('grid gap-3', cards.length === 1 ? 'grid-cols-1 sm:grid-cols-2' : `grid-cols-2 lg:grid-cols-${Math.min(cards.length, 4)}`)}>
      {cards.map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="card p-4 flex items-center gap-3">
          <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            color === 'blue'   && 'bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400',
            color === 'green'  && 'bg-green-50 dark:bg-green-900/20 text-green-500 dark:text-green-400',
            color === 'red'    && 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
            color === 'indigo' && 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400',
          )}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
            <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function Reports() {
  const { currentInstituteId, currentInstituteName, selectedInstitute } = useAppStore()
  const instituteId = currentInstituteId || selectedInstitute || null
  const institute   = { name: currentInstituteName }

  const [activeType,    setActiveType]    = useState('student')
  const [filters,       setFilters]       = useState({})
  const [page,          setPage]          = useState(1)
  const [result,        setResult]        = useState(null)   // { rows, total, pages, summary }
  const [allRows,       setAllRows]       = useState([])     // full unpagedresult for export
  const [options,       setOptions]       = useState({ classes: [], mediums: [], boards: [], years: [] })
  const [loading,       setLoading]       = useState(false)
  const [exporting,     setExporting]     = useState(false)
  const [toast,         setToast]         = useState(null)

  // Ref to cancel stale fetches
  const runIdRef = useRef(0)

  // ── Load filter options ─────────────────────────────────────────────────
  useEffect(() => {
    if (!instituteId) return
    getFilterOptions(instituteId).then(setOptions).catch(() => {})
  }, [instituteId])

  // ── Run report (auto re-run when type/filters/page change) ──────────────
  const runReportQuery = useCallback(async (type, currentFilters, currentPage, doFetchAll = false) => {
    if (!instituteId) return
    const runId = ++runIdRef.current
    setLoading(true)

    try {
      const pageResult = await runReport(type, instituteId, { ...currentFilters, page: currentPage, pageSize: PAGE_SIZE })
      if (runId !== runIdRef.current) return  // stale

      setResult(pageResult)

      // For export we also need all rows (no pagination) — fetch only when requested
      if (doFetchAll || allRows.length === 0) {
        const fullResult = await runReport(type, instituteId, { ...currentFilters, page: 1, pageSize: 99999 })
        if (runId !== runIdRef.current) return
        setAllRows(fullResult.rows ?? [])
      }
    } catch (err) {
      console.error('Report error:', err)
      showToast('Failed to load report', 'error')
    } finally {
      if (runId === runIdRef.current) setLoading(false)
    }
  }, [instituteId])

  // Debounce: wait 300ms after filter changes before querying
  const debounceRef = useRef(null)
  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      runReportQuery(activeType, filters, page, true)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [activeType, filters, page, instituteId])

  // ── Helpers ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
    setAllRows([])
  }, [])

  const handleReset = useCallback(() => {
    setFilters({})
    setPage(1)
    setAllRows([])
  }, [])

  const handleTypeChange = useCallback((type) => {
    setActiveType(type)
    setFilters({})
    setPage(1)
    setResult(null)
    setAllRows([])
  }, [])

  const handlePageChange = useCallback((n) => {
    setPage(n)
  }, [])

  // ── Excel Export ─────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      // Ensure we have all rows
      let exportRows = allRows
      if (!exportRows.length && result?.rows?.length) {
        const full = await runReport(activeType, instituteId, { ...filters, page: 1, pageSize: 99999 })
        exportRows = full.rows ?? []
        setAllRows(exportRows)
      }

      if (!exportRows.length) {
        showToast('No data to export', 'error')
        return
      }

      const headers = exportRows.length > 0 ? Object.keys(exportRows[0]) : []

      exportToExcel({
        reportType:    activeType,
        instituteName: institute?.name ?? '',
        filters,
        headers,
        allRows:       exportRows,
        summary:       result?.summary ?? {},
      })

      showToast(`Excel exported — ${exportRows.length} rows`)
    } catch (err) {
      console.error('Export error:', err)
      showToast('Export failed. Please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }, [activeType, instituteId, institute, filters, allRows, result, exporting, showToast])

  // ── Derived ──────────────────────────────────────────────────────────────
  const headers = useMemo(() => result?.rows?.length ? Object.keys(result.rows[0]) : [], [result])
  const activeConfig = REPORT_TYPES.find(t => t.key === activeType)

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <BarChart3 className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No institute found. Add one first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Reports</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {activeConfig?.desc} · {institute?.name}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => runReportQuery(activeType, filters, page, true)}
            disabled={loading}
            className="btn-secondary p-2"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading || !result?.rows?.length}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
              exporting || !result?.rows?.length
                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            )}
          >
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Exporting…</>
              : <><Download className="w-4 h-4" /> Export Excel</>
            }
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORT_TYPES.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => handleTypeChange(key)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all',
              activeType === key
                ? clsx('border', TYPE_COLOR[color], 'shadow-sm')
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <ReportFilters
        reportType={activeType}
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleReset}
        options={options}
        loading={loading}
      />

      {/* Summary Cards */}
      {result && <SummaryCards result={result} reportType={activeType} />}

      {/* Data Table */}
      <ReportTable
        headers={headers}
        rows={result?.rows ?? []}
        total={result?.total ?? 0}
        page={page}
        pages={result?.pages ?? 1}
        pageSize={PAGE_SIZE}
        onPage={handlePageChange}
        loading={loading}
        emptyText={
          loading ? 'Loading…'
          : Object.values(filters).some(v => v)
            ? 'No records match your filters.'
            : 'No data yet. Add students and record fees first.'
        }
      />

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
        )}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
