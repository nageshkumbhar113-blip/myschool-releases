import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, Filter, Users, ChevronDown,
  Eye, CreditCard, Trash2, RefreshCw,
} from 'lucide-react'
import useStudentStore from '../store/useStudentStore'
import InstallmentModal from '../components/InstallmentModal'
import { getCurrentInstituteId } from '../utils/dbHelpers'
import { getFeeStatus, FEE_STATUS_META, formatCurrency } from '../utils/feeCalculations'
import clsx from 'clsx'

// ── Constants ────────────────────────────────────────────────────────────────
const ROW_H  = 72   // px — must match StudentRow height
const BUFFER = 5    // extra rows above/below viewport

const CLASSES = ['1','2','3','4','5','6','7','8','9','10','11-Sci','11-Com','12-Sci','12-Com']
  .flatMap(c => ['A','B','C'].map(s => `${c}-${s}`))
const MEDIUMS = ['English', 'Hindi', 'Marathi', 'Semi-English', 'Urdu']
const BOARDS  = ['State Board', 'CBSE', 'ICSE', 'IB', 'IGCSE']

// ── Virtual scroll hook ───────────────────────────────────────────────────────
function useVirtualList(items) {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH,    setViewH]     = useState(ROW_H * 10)
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    setViewH(el.clientHeight)
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - BUFFER)
  const endIdx   = Math.min(items.length, Math.ceil((scrollTop + viewH) / ROW_H) + BUFFER)

  return {
    containerRef,
    onScroll: (e) => setScrollTop(e.currentTarget.scrollTop),
    totalHeight: items.length * ROW_H,
    offsetY:     startIdx * ROW_H,
    visible:     items.slice(startIdx, endIdx),
  }
}

// ── Student row (memoized) ────────────────────────────────────────────────────
const StudentRow = React.memo(function StudentRow({ student, onView, onCollect, onDelete }) {
  const status = getFeeStatus(student.fee)
  const meta   = FEE_STATUS_META[status]
  const name   = student.dynamicFields?.studentName ?? 'Unknown'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group cursor-pointer"
      style={{ height: ROW_H }}
      onClick={() => onView(student.id)}
    >
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
        {student.dynamicFields?.photo
          ? <img src={student.dynamicFields.photo} alt="" className="w-9 h-9 rounded-full object-cover" />
          : <span className="text-xs font-bold text-primary-700 dark:text-primary-400">{initials}</span>
        }
      </div>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {student.rollNumber && (
            <span className="text-xs text-gray-400 font-mono">{student.rollNumber}</span>
          )}
          {student.class && (
            <span className="text-xs text-gray-400">Class {student.class}</span>
          )}
          {student.medium && (
            <span className="text-xs text-gray-400">{student.medium}</span>
          )}
        </div>
      </div>

      {/* Fee info */}
      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 min-w-[110px]">
        {student.fee ? (
          <>
            <span className="text-xs font-semibold text-gray-900 dark:text-white">
              {formatCurrency(student.fee.paidAmount)}
              <span className="text-gray-400 font-normal"> / {formatCurrency(student.fee.effectiveFee)}</span>
            </span>
            <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', meta.bg, meta.text)}>
              <span className={clsx('w-1.5 h-1.5 rounded-full', meta.dot)} />
              {meta.label}
            </span>
          </>
        ) : (
          <span className="text-xs text-gray-400">No fee record</span>
        )}
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
        onClick={e => e.stopPropagation()}
      >
        {status !== 'paid' && student.fee && (
          <button
            onClick={() => onCollect(student)}
            title="Collect payment"
            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 text-gray-400 hover:text-green-600 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => onView(student.id)}
          title="View details"
          className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-400 hover:text-primary-600 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(student)}
          title="Delete student"
          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
})

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Students() {
  const navigate   = useNavigate()
  const { students, loading, loadStudents, deleteStudent, addInstallment } = useStudentStore()

  const [search,      setSearch]      = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [filterMedium,setFilterMedium]= useState('')
  const [filterBoard, setFilterBoard] = useState('')
  const [filterStatus,setFilterStatus]= useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [collectTarget, setCollectTarget] = useState(null) // student for modal
  const [toast, setToast] = useState(null)

  const instituteId = getCurrentInstituteId()

  useEffect(() => {
    if (instituteId) loadStudents(instituteId)
  }, [instituteId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(s => {
      const name = (s.dynamicFields?.studentName ?? '').toLowerCase()
      const roll = (s.rollNumber ?? '').toLowerCase()
      if (q && !name.includes(q) && !roll.includes(q)) return false
      if (filterClass  && s.class  !== filterClass)  return false
      if (filterMedium && s.medium !== filterMedium) return false
      if (filterBoard  && s.board  !== filterBoard)  return false
      if (filterStatus && getFeeStatus(s.fee) !== filterStatus) return false
      return true
    })
  }, [students, search, filterClass, filterMedium, filterBoard, filterStatus])

  const activeFilters = [filterClass, filterMedium, filterBoard, filterStatus].filter(Boolean).length

  // ── Virtual list ──────────────────────────────────────────────────────────
  const { containerRef, onScroll, totalHeight, offsetY, visible } = useVirtualList(filtered)

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async (student) => {
    const name = student.dynamicFields?.studentName ?? 'this student'
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    await deleteStudent(student.id)
    showToast('Student removed')
  }, [deleteStudent])

  const handleCollect = useCallback(async (data) => {
    const result = await addInstallment(collectTarget.id, data)
    showToast(`Payment recorded · ${result.receiptNumber}`)
    return result
  }, [collectTarget, addInstallment])

  // ── Summary stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const statuses = students.map(s => getFeeStatus(s.fee))
    return {
      total:   students.length,
      paid:    statuses.filter(s => s === 'paid').length,
      partial: statuses.filter(s => s === 'partial').length,
      pending: statuses.filter(s => s === 'pending' || s === 'overdue').length,
    }
  }, [students])

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Students</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {students.length.toLocaleString()} registered
            {filtered.length !== students.length && ` · ${filtered.length} shown`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => instituteId && loadStudents(instituteId)} className="btn-secondary p-2" title="Refresh">
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={() => navigate('/students/add')} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',   value: stats.total,   color: 'text-gray-900 dark:text-white',              bg: 'bg-white dark:bg-gray-900'              },
          { label: 'Paid',    value: stats.paid,    color: 'text-green-700 dark:text-green-400',          bg: 'bg-green-50 dark:bg-green-900/20'        },
          { label: 'Partial', value: stats.partial, color: 'text-yellow-700 dark:text-yellow-400',        bg: 'bg-yellow-50 dark:bg-yellow-900/20'      },
          { label: 'Pending', value: stats.pending, color: 'text-red-700 dark:text-red-400',              bg: 'bg-red-50 dark:bg-red-900/20'            },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={clsx('card p-3 text-center', bg)}>
            <p className={clsx('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, roll number…"
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowFilters(p => !p)}
          className={clsx('btn-secondary relative', activeFilters > 0 && 'text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-700')}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilters > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          {[
            { label: 'Class',  value: filterClass,  set: setFilterClass,  options: CLASSES  },
            { label: 'Medium', value: filterMedium, set: setFilterMedium, options: MEDIUMS  },
            { label: 'Board',  value: filterBoard,  set: setFilterBoard,  options: BOARDS   },
            { label: 'Status', value: filterStatus, set: setFilterStatus, options: ['paid','partial','pending','overdue'] },
          ].map(({ label, value, set, options }) => (
            <div key={label}>
              <label className="label text-xs">{label}</label>
              <select value={value} onChange={e => set(e.target.value)} className="input text-sm">
                <option value="">All {label}s</option>
                {options.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
            </div>
          ))}
          <div className="col-span-2 sm:col-span-4 flex justify-end">
            <button
              onClick={() => { setFilterClass(''); setFilterMedium(''); setFilterBoard(''); setFilterStatus('') }}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <div className="w-9 shrink-0" />
          <div className="flex-1">Student</div>
          <div className="hidden sm:block min-w-[110px] text-right">Fee Status</div>
          <div className="w-20 shrink-0" />
        </div>

        {/* Virtual list */}
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 border-b border-gray-100 dark:border-gray-800 animate-pulse" style={{ height: ROW_H }}>
                <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded w-1/4" />
                </div>
                <div className="w-24 h-5 bg-gray-100 dark:bg-gray-800 rounded-full" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Users className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {!instituteId ? 'No active license. Please activate a license first.' : students.length === 0 ? 'No students yet.' : 'No students match your filters.'}
            </p>
            {students.length === 0 && (
              <button onClick={() => navigate('/students/add')} className="btn-primary mt-1">
                <Plus className="w-4 h-4" /> Add First Student
              </button>
            )}
          </div>
        ) : (
          <div
            ref={containerRef}
            className="overflow-y-auto"
            style={{ maxHeight: `${ROW_H * 10}px` }}
            onScroll={onScroll}
          >
            <div style={{ height: totalHeight, position: 'relative' }}>
              <div style={{ position: 'absolute', top: offsetY, left: 0, right: 0 }}>
                {visible.map(student => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    onView={id => navigate(`/students/${id}`)}
                    onCollect={s => setCollectTarget(s)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 flex items-center justify-between">
            <span>{filtered.length.toLocaleString()} student{filtered.length !== 1 ? 's' : ''}</span>
            {filtered.length > 10 && (
              <span className="text-gray-400">Scroll to see all · Virtual rendering active</span>
            )}
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
