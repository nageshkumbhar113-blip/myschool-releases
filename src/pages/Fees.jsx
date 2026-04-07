import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard, Search, TrendingUp, AlertCircle,
  CheckCircle, Clock, RefreshCw, ChevronDown, Eye,
} from 'lucide-react'
import useAppStore from '../store/useAppStore'
import useStudentStore from '../store/useStudentStore'
import InstallmentModal from '../components/InstallmentModal'
import FeeCard          from '../components/FeeCard'
import {
  formatCurrency, getFeeStatus, FEE_STATUS_META, aggregateFees,
} from '../utils/feeCalculations'
import clsx from 'clsx'

const STATUS_ICONS = {
  paid:    CheckCircle,
  partial: Clock,
  overdue: AlertCircle,
  pending: Clock,
}

export default function Fees() {
  const navigate   = useNavigate()
  const { currentInstituteId, selectedInstitute } = useAppStore()
  const { students, loading, loadStudents, addInstallment } = useStudentStore()

  const [search,  setSearch]  = useState('')
  const [filter,  setFilter]  = useState('all')
  const [sortBy,  setSortBy]  = useState('name')
  const [collectTarget, setCollectTarget] = useState(null)
  const [toast,   setToast]   = useState(null)

  const instituteId = currentInstituteId || selectedInstitute || null

  useEffect(() => {
    if (instituteId) loadStudents(instituteId)
  }, [instituteId])

  const showToast = (msg) => {
    setToast({ msg })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const agg = useMemo(() => {
    const fees = students.map(s => s.fee).filter(Boolean)
    return aggregateFees(fees)
  }, [students])

  // ── Filtered + sorted ─────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    const q = search.toLowerCase()
    let list = students.filter(s => {
      const name = (s.dynamicFields?.studentName ?? '').toLowerCase()
      const roll = (s.rollNumber ?? '').toLowerCase()
      if (q && !name.includes(q) && !roll.includes(q)) return false

      const status = getFeeStatus(s.fee)
      if (filter === 'all')     return true
      if (filter === 'paid')    return status === 'paid'
      if (filter === 'partial') return status === 'partial'
      if (filter === 'pending') return status === 'pending'
      if (filter === 'overdue') return status === 'overdue'
      return true
    })

    list.sort((a, b) => {
      if (sortBy === 'name')      return (a.dynamicFields?.studentName ?? '').localeCompare(b.dynamicFields?.studentName ?? '')
      if (sortBy === 'remaining') return (b.fee?.remainingAmount ?? 0) - (a.fee?.remainingAmount ?? 0)
      if (sortBy === 'paid')      return (b.fee?.paidAmount ?? 0) - (a.fee?.paidAmount ?? 0)
      return 0
    })
    return list
  }, [students, search, filter, sortBy])

  const handleCollect = async (data) => {
    const result = await addInstallment(collectTarget.id, data)
    showToast(`Recorded · ${result.receiptNumber}`)
    return result
  }

  const collectionRate = agg.totalExpected > 0
    ? Math.round((agg.totalCollected / agg.totalExpected) * 100)
    : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Fee Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {agg.count} students · {collectionRate}% collected
          </p>
        </div>
        <button onClick={() => instituteId && loadStudents(instituteId)} className="btn-secondary p-2">
          <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Expected',  value: formatCurrency(agg.totalExpected),  icon: CreditCard,  color: 'blue'  },
          { label: 'Collected',       value: formatCurrency(agg.totalCollected), icon: CheckCircle, color: 'green' },
          { label: 'Pending',         value: formatCurrency(agg.totalPending),   icon: AlertCircle, color: 'red'   },
          { label: 'Total Discounts', value: formatCurrency(agg.totalDiscount),  icon: TrendingUp,  color: 'purple'},
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4 flex items-center gap-4">
            <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0',
              color === 'blue'   && 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
              color === 'green'  && 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
              color === 'red'    && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
              color === 'purple' && 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
              <p className="text-base font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Collection progress */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium text-gray-900 dark:text-white">Overall Collection Rate</span>
          <span className="font-bold text-primary-600 dark:text-primary-400">{collectionRate}%</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-700',
              collectionRate >= 90 ? 'bg-green-500' :
              collectionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            )}
            style={{ width: `${collectionRate}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-xs text-gray-400">
          <span>{formatCurrency(agg.totalCollected)} collected</span>
          <span>{formatCurrency(agg.totalPending)} pending</span>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search student…" className="input pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all','paid','partial','pending','overdue'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={clsx(
              'px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors',
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            )}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="input text-sm pr-8 appearance-none w-36">
            <option value="name">Sort: Name</option>
            <option value="remaining">Sort: Pending</option>
            <option value="paid">Sort: Paid</option>
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Student fee table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Student</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Effective</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Paid</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Remaining</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Status</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400">No students match</td>
                </tr>
              ) : displayed.map(student => {
                const fee    = student.fee
                const status = getFeeStatus(fee)
                const meta   = FEE_STATUS_META[status]
                const Icon   = STATUS_ICONS[status] ?? Clock
                const name   = student.dynamicFields?.studentName ?? 'Unknown'

                return (
                  <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{name[0]}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{name}</p>
                          {student.class && <p className="text-xs text-gray-400">Class {student.class}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 hidden md:table-cell">
                      {fee ? formatCurrency(fee.effectiveFee) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-600 dark:text-green-400">
                      {fee ? formatCurrency(fee.paidAmount) : '—'}
                    </td>
                    <td className={clsx('px-4 py-3 text-right font-medium',
                      (fee?.remainingAmount ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                    )}>
                      {fee ? formatCurrency(fee.remainingAmount) : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', meta.bg, meta.text)}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => navigate(`/students/${student.id}`)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-primary-600" title="View">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {status !== 'paid' && fee && (
                          <button onClick={() => setCollectTarget(student)}
                            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600" title="Collect">
                            <CreditCard className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {displayed.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            {displayed.length} student{displayed.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Installment modal */}
      {collectTarget && (
        <InstallmentModal
          student={collectTarget}
          fee={collectTarget.fee}
          onSubmit={handleCollect}
          onClose={() => setCollectTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium px-4 py-3 rounded-xl shadow-lg">
          {toast.msg}
        </div>
      )}
    </div>
  )
}
