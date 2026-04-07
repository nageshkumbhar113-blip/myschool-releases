/**
 * Promotion.jsx
 *
 * Student promotion page — move students to a new academic year + class.
 *
 * Flow:
 *  1. Filter: Source year + class  →  loads matching students
 *  2. Select students via PromotionTable (checkboxes)
 *  3. Set target: new academic year + new class
 *  4. (Optional) set default fee for promoted students
 *  5. Preview (dry-run) → Confirm → Promote
 *  6. Show result summary
 */

import React, { useCallback, useEffect, useState } from 'react'
import {
  ArrowRight, GraduationCap, Loader2, CheckCircle,
  AlertCircle, RefreshCw, Users, ChevronDown, Info,
} from 'lucide-react'
import useAppStore from '../store/useAppStore'
import PromotionTable from '../components/PromotionTable'
import {
  getAcademicYears,
  getClassesForYear,
  loadStudentsForPromotion,
  promoteStudents,
  previewPromotion,
} from '../utils/promotion'
import clsx from 'clsx'

// ── Helpers ───────────────────────────────────────────────────────────────

function SectionHeader({ step, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {step}
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function Select({ label, value, onChange, children, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="input text-sm py-2"
      >
        {children}
      </select>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────

export default function Promotion() {
  const { currentInstituteId, selectedInstitute } = useAppStore()
  const instituteId = currentInstituteId || selectedInstitute || null

  // ── Source filters ────────────────────────────────────────────────────
  const [sourceYear,    setSourceYear]    = useState('')
  const [sourceClass,   setSourceClass]   = useState('')
  const [years,         setYears]         = useState([])
  const [sourceClasses, setSourceClasses] = useState([])

  // ── Student list ──────────────────────────────────────────────────────
  const [students,  setStudents]  = useState([])
  const [selected,  setSelected]  = useState(new Set())   // Set<string> of IDs
  const [loading,   setLoading]   = useState(false)

  // ── Target settings ───────────────────────────────────────────────────
  const [targetYear,  setTargetYear]  = useState('')
  const [targetClass, setTargetClass] = useState('')
  const [defaultFee,  setDefaultFee]  = useState('')
  const [defaultDisc, setDefaultDisc] = useState('')

  // ── Result ────────────────────────────────────────────────────────────
  const [preview,    setPreview]    = useState(null)   // { wouldCreate, wouldSkip }
  const [previewing, setPreviewing] = useState(false)
  const [promoting,  setPromoting]  = useState(false)
  const [result,     setResult]     = useState(null)   // promotion result
  const [toast,      setToast]      = useState(null)

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  // Load years on mount
  useEffect(() => {
    if (!instituteId) return
    getAcademicYears(instituteId).then(y => {
      setYears(y)
      if (y.length) setSourceYear(y[0])
    }).catch(() => {})
  }, [instituteId])

  // Load classes when source year changes
  useEffect(() => {
    if (!instituteId || !sourceYear) { setSourceClasses([]); return }
    getClassesForYear(instituteId, sourceYear).then(c => {
      setSourceClasses(c)
      setSourceClass('')
    }).catch(() => {})
  }, [instituteId, sourceYear])

  // Load students when source year / class changes
  useEffect(() => {
    if (!instituteId || !sourceYear) { setStudents([]); setSelected(new Set()); return }
    setLoading(true)
    loadStudentsForPromotion(instituteId, sourceYear, sourceClass)
      .then(rows => {
        setStudents(rows)
        setSelected(new Set(rows.map(s => s.id)))  // auto-select all
        setResult(null)
        setPreview(null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [instituteId, sourceYear, sourceClass])

  // ── Selection helpers ─────────────────────────────────────────────────

  const handleToggle = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else              next.add(id)
      return next
    })
  }, [])

  const handleToggleAll = useCallback(() => {
    setSelected(prev =>
      prev.size === students.length
        ? new Set()
        : new Set(students.map(s => s.id)),
    )
  }, [students])

  // ── Preview ───────────────────────────────────────────────────────────

  const handlePreview = async () => {
    if (!selected.size) return showToast('Select at least one student.', 'error')
    if (!targetYear.trim()) return showToast('Enter a target academic year.', 'error')
    if (!targetClass.trim()) return showToast('Enter a target class.', 'error')
    if (targetYear === sourceYear && targetClass === sourceClass)
      return showToast('Target must differ from source year/class.', 'error')

    const toPromote = students.filter(s => selected.has(s.id))
    setPreviewing(true)
    setPreview(null)
    try {
      const p = await previewPromotion(toPromote, targetClass.trim(), targetYear.trim(), instituteId)
      setPreview(p)
    } catch (err) {
      showToast('Preview failed: ' + err.message, 'error')
    } finally {
      setPreviewing(false)
    }
  }

  // ── Promote ───────────────────────────────────────────────────────────

  const handlePromote = async () => {
    const toPromote = students.filter(s => selected.has(s.id))
    if (!toPromote.length) return
    setPromoting(true)
    setResult(null)
    try {
      const r = await promoteStudents(
        toPromote,
        targetClass.trim(),
        targetYear.trim(),
        instituteId,
        {
          totalFee: Number(defaultFee  || 0),
          discount: Number(defaultDisc || 0),
        },
      )
      setResult(r)
      setPreview(null)
      showToast(`${r.created} student${r.created !== 1 ? 's' : ''} promoted successfully!`)
    } catch (err) {
      showToast('Promotion failed: ' + err.message, 'error')
    } finally {
      setPromoting(false)
    }
  }

  const resetAll = () => {
    setResult(null)
    setPreview(null)
    setSelected(new Set(students.map(s => s.id)))
    setTargetYear('')
    setTargetClass('')
    setDefaultFee('')
    setDefaultDisc('')
  }

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <GraduationCap className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No institute selected.</p>
      </div>
    )
  }

  const selectedStudents = students.filter(s => selected.has(s.id))

  return (
    <div className="space-y-5 max-w-5xl mx-auto">

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Student Promotion</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Promote students to a new academic year. Source records are kept intact.
        </p>
      </div>

      {/* Result banner */}
      {result && (
        <div className="card p-5 border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/10">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2">Promotion Complete</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{result.created}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Promoted</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{result.skipped}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Skipped (duplicates)</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{result.errors.length}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Errors</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="text-xs text-red-700 dark:text-red-400 space-y-1">
                  {result.errors.map((e, i) => <p key={i}>• {e}</p>)}
                </div>
              )}
              <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                Promoted to <strong>Class {targetClass}</strong> · Academic Year <strong>{targetYear}</strong>
              </p>
            </div>
          </div>
          <button onClick={resetAll} className="mt-3 btn-secondary text-sm">
            <RefreshCw className="w-4 h-4" /> Promote More Students
          </button>
        </div>
      )}

      {!result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── Left: Steps 1 + 3 ────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Step 1: Source filters */}
            <div className="card p-5">
              <SectionHeader step="1" title="Source" subtitle="Which students to promote?" />
              <div className="space-y-3">
                <Select
                  label="Academic Year"
                  value={sourceYear}
                  onChange={v => { setSourceYear(v); setSourceClass('') }}
                >
                  <option value="">— Select year —</option>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </Select>

                <Select
                  label="Class (optional — all if blank)"
                  value={sourceClass}
                  onChange={setSourceClass}
                  disabled={!sourceYear}
                >
                  <option value="">All Classes</option>
                  {sourceClasses.map(c => <option key={c} value={c}>Class {c}</option>)}
                </Select>
              </div>

              {students.length > 0 && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {students.length} student{students.length !== 1 ? 's' : ''} found
                </p>
              )}
            </div>

            {/* Step 3: Target + fee defaults */}
            <div className="card p-5">
              <SectionHeader step="3" title="Target" subtitle="Where to promote to?" />
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                    New Academic Year <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetYear}
                    onChange={e => { setTargetYear(e.target.value); setPreview(null) }}
                    placeholder="e.g. 2025-26"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                    New Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetClass}
                    onChange={e => { setTargetClass(e.target.value); setPreview(null) }}
                    placeholder="e.g. 6 or VII-A"
                    className="input text-sm py-2 w-full"
                  />
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Default fee (optional)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-400 block mb-0.5">Total Fee (₹)</label>
                      <input
                        type="number"
                        value={defaultFee}
                        onChange={e => setDefaultFee(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="input text-sm py-1.5 w-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-0.5">Discount (₹)</label>
                      <input
                        type="number"
                        value={defaultDisc}
                        onChange={e => setDefaultDisc(e.target.value)}
                        placeholder="0"
                        min="0"
                        className="input text-sm py-1.5 w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview + Promote buttons */}
              <div className="mt-4 space-y-2">
                {!preview && (
                  <button
                    onClick={handlePreview}
                    disabled={previewing || !selected.size || !targetYear.trim() || !targetClass.trim()}
                    className={clsx(
                      'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-colors',
                      previewing || !selected.size || !targetYear.trim() || !targetClass.trim()
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300',
                    )}
                  >
                    {previewing
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</>
                      : <><CheckCircle className="w-4 h-4" /> Preview</>
                    }
                  </button>
                )}

                {preview && (
                  <div className="bg-primary-50 dark:bg-primary-900/10 rounded-xl p-3 text-xs space-y-1 border border-primary-200 dark:border-primary-800">
                    <p className="font-semibold text-primary-800 dark:text-primary-300">Promotion Preview</p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-bold text-green-700 dark:text-green-400">{preview.wouldCreate}</span> will be promoted
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-bold text-yellow-700 dark:text-yellow-400">{preview.wouldSkip}</span> already exist (will skip)
                    </p>
                  </div>
                )}

                <button
                  onClick={handlePromote}
                  disabled={promoting || !selected.size || !targetYear.trim() || !targetClass.trim()}
                  className={clsx(
                    'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    promoting || !selected.size || !targetYear.trim() || !targetClass.trim()
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-600 hover:bg-primary-700 text-white',
                  )}
                >
                  {promoting
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Promoting…</>
                    : <><GraduationCap className="w-4 h-4" /> Promote {selected.size} Student{selected.size !== 1 ? 's' : ''} <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Step 2 — Student table ─────────────────────────── */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-800">
                <SectionHeader
                  step="2"
                  title="Select Students"
                  subtitle={students.length ? `${selected.size} of ${students.length} selected for promotion` : 'Load students by selecting a year above'}
                />
              </div>
              <PromotionTable
                students={students}
                selected={selected}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                loading={loading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
        )}>
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4" />
            : <CheckCircle className="w-4 h-4" />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}
