/**
 * ReportFilters.jsx
 *
 * Renders the filter panel for the Reports page.
 * Which filters are shown depends on the active report type.
 *
 * Props:
 *   reportType   — 'student' | 'collection' | 'pending' | 'classwise' | 'register'
 *   filters      — current filter state object
 *   onChange     — (key, value) => void
 *   onReset      — () => void
 *   options      — { classes, mediums, boards, years } from getFilterOptions()
 *   loading      — bool
 */

import React from 'react'
import { X, SlidersHorizontal } from 'lucide-react'
import clsx from 'clsx'

// Which filters each report type uses
const REPORT_FILTER_MAP = {
  student:    ['search', 'academicYear', 'class', 'medium', 'board', 'status', 'dateFrom', 'dateTo'],
  collection: ['search', 'dateFrom', 'dateTo', 'class', 'paymentMode', 'academicYear'],
  pending:    ['search', 'academicYear', 'class', 'medium', 'board'],
  classwise:  ['academicYear', 'medium', 'board'],
  register:   ['search', 'dateFrom', 'dateTo', 'class', 'paymentMode'],
}

const PAYMENT_MODES = ['Cash', 'Online Transfer', 'UPI', 'Cheque', 'NEFT', 'DD']
const STUDENT_STATUSES = ['active', 'inactive', 'transferred', 'graduated']

function Select({ label, value, onChange, children, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="input text-sm py-1.5"
      >
        {children}
      </select>
    </div>
  )
}

function DateInput({ label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input text-sm py-1.5"
      />
    </div>
  )
}

function SearchInput({ value, onChange }) {
  return (
    <div className="flex flex-col gap-1 sm:col-span-2">
      <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Search</label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Student name or receipt number…"
          className="input text-sm py-1.5 pr-8"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export default function ReportFilters({ reportType, filters, onChange, onReset, options, loading }) {
  const activeFilters = REPORT_FILTER_MAP[reportType] ?? []
  const show = (key) => activeFilters.includes(key)

  // Count active (non-empty) filter values
  const activeCount = Object.entries(filters).filter(([k, v]) => k !== 'page' && v !== '' && v != null).length

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filters</span>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
          >
            <X className="w-3 h-3" /> Reset
          </button>
        )}
      </div>

      <div className={clsx(
        'grid gap-3',
        activeFilters.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' :
        activeFilters.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
        'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
      )}>
        {show('search') && (
          <SearchInput value={filters.search ?? ''} onChange={v => onChange('search', v)} />
        )}

        {show('academicYear') && (
          <Select label="Academic Year" value={filters.academicYear ?? ''} onChange={v => onChange('academicYear', v)} disabled={loading}>
            <option value="">All Years</option>
            {(options?.years ?? []).map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
        )}

        {show('class') && (
          <Select label="Class" value={filters.class ?? ''} onChange={v => onChange('class', v)} disabled={loading}>
            <option value="">All Classes</option>
            {(options?.classes ?? []).map(c => <option key={c} value={c}>Class {c}</option>)}
          </Select>
        )}

        {show('medium') && (
          <Select label="Medium" value={filters.medium ?? ''} onChange={v => onChange('medium', v)} disabled={loading}>
            <option value="">All Mediums</option>
            {(options?.mediums ?? []).map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        )}

        {show('board') && (
          <Select label="Board" value={filters.board ?? ''} onChange={v => onChange('board', v)} disabled={loading}>
            <option value="">All Boards</option>
            {(options?.boards ?? []).map(b => <option key={b} value={b}>{b}</option>)}
          </Select>
        )}

        {show('status') && (
          <Select label="Student Status" value={filters.status ?? ''} onChange={v => onChange('status', v)} disabled={loading}>
            <option value="">All Statuses</option>
            {STUDENT_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </Select>
        )}

        {show('paymentMode') && (
          <Select label="Payment Mode" value={filters.paymentMode ?? ''} onChange={v => onChange('paymentMode', v)} disabled={loading}>
            <option value="">All Modes</option>
            {PAYMENT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </Select>
        )}

        {show('dateFrom') && (
          <DateInput label="Date From" value={filters.dateFrom ?? ''} onChange={v => onChange('dateFrom', v)} />
        )}

        {show('dateTo') && (
          <DateInput label="Date To" value={filters.dateTo ?? ''} onChange={v => onChange('dateTo', v)} />
        )}
      </div>
    </div>
  )
}
