import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Trash2, User, BookOpen,
  Receipt, Calendar, CreditCard, CheckCircle,
  AlertCircle, Loader2, Clock, FileText, Award,
} from 'lucide-react'
import useStudentStore        from '../store/useStudentStore'
import useAppStore            from '../store/useAppStore'
import useSettingsStore       from '../store/useSettingsStore'
import FeeCard                from '../components/FeeCard'
import InstallmentModal       from '../components/InstallmentModal'
import NewLCPreview           from '../components/lc/NewLCPreview'
import ManualFieldsModal      from '../components/ManualFieldsModal'
import ValidationWarningModal from '../components/ValidationWarningModal'
import AdmissionFormPreview   from '../components/AdmissionFormPreview'
import useDocumentValidation  from '../hooks/useDocumentValidation'
import { getActiveTemplate, getFields }  from '../utils/dbHelpers'
import { migrateFieldMappings } from '../utils/fieldTypes'
import { isStudentDynamicFieldKey, isCustomStudentProfileField } from '../utils/studentFieldFilter'
import { isEmptyDocumentValue, resolveDocumentFieldValue } from '../utils/documentValueResolver'
import { ensureLcBonafidePrintFields } from '../utils/documentTemplateDefaults'
import { formatCurrency } from '../utils/feeCalculations'
import clsx                   from 'clsx'

const DOCUMENT_META = {
  lc: {
    type: 'lc',
    label: 'Leaving Certificate',
    title: 'SCHOOL LEAVING CERTIFICATE',
    missingMessage: 'No active LC template. Open Template Builder and activate one first.',
    loadError: 'Failed to load LC template',
  },
  bonafide: {
    type: 'bonafide',
    label: 'Bonafide Certificate',
    title: 'BONAFIDE CERTIFICATE',
    missingMessage: 'No active bonafide template. Open Template Builder and activate one first.',
    loadError: 'Failed to load bonafide template',
  },
}

function formatDynamicFieldLabel(key) {
  if (key === 'resistorNo') return 'Reg. No.'
  return key.replace(/([A-Z])/g, ' $1').trim()
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-32 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-900 dark:text-white font-medium break-all">{value}</span>
    </div>
  )
}

export default function StudentDetail() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { activeStudent, loading, loadStudent, deleteStudent, addInstallment } = useStudentStore()
  const { currentInstituteId, selectedInstitute } = useAppStore()

  const [showModal,    setShowModal]    = useState(false)
  const [toast,        setToast]        = useState(null)

  // â”€â”€ New renderer state (Phase 6) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [lcTemplate,       setLcTemplate]       = useState(null)
  const [lcFields,         setLcFields]         = useState([])
  const [showManualModal,  setShowManualModal]  = useState(false)
  const [manualData,       setManualData]       = useState({})
  const [showNewLCPreview, setShowNewLCPreview] = useState(false)
  const [showValidation,   setShowValidation]   = useState(false)
  const [pendingManual,    setPendingManual]    = useState(null)
  const [activeDocMeta,    setActiveDocMeta]    = useState(DOCUMENT_META.lc)
  const [showAdmissionPreview, setShowAdmissionPreview] = useState(false)
  const [admissionFields, setAdmissionFields] = useState([])
  const [additionalManualFields, setAdditionalManualFields] = useState([])

  const { settings, loadSettings } = useSettingsStore()
  const instituteId = currentInstituteId || selectedInstitute || null

  useEffect(() => {
    loadStudent(id)
  }, [id])

  useEffect(() => {
    if (instituteId) loadSettings(instituteId)
  }, [instituteId])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleCollect = async (data) => {
    const result = await addInstallment(id, data)
    showToast(`Payment recorded Â· ${result.receiptNumber}`)
    return result
  }

  const handleDelete = async () => {
    const name = activeStudent?.dynamicFields?.studentName ?? 'this student'
    if (!confirm(`Remove ${name}? This cannot be undone.`)) return
    await deleteStudent(id)
    navigate('/students')
  }
  const loadDocumentTemplate = async (docMeta) => {
    if (!activeStudent) return
    if (!instituteId) return showToast('No institute selected', 'error')

    // â”€â”€ Feature flag: use new unified renderer? â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Prefer the active LC template whenever one exists.
    // Fall back to the classic fixed preview only when no active template is set.
    try {
      let template = await getActiveTemplate(instituteId, docMeta.type)

      if (!template) {
        showToast(docMeta.missingMessage, 'error')
        return
      }

      // Ensure fieldMappings have Phase 1 schema (migration may not have run yet)
      template = {
        ...template,
        fieldMappings: migrateFieldMappings(template.fieldMappings),
      }

      // Load all field definitions for this institute
      const flds = await getFields(instituteId)
      const hydrated = ensureLcBonafidePrintFields(template, flds)
      const hydratedTemplate = hydrated.template
      const hydratedFields = hydrated.fields

      setActiveDocMeta(docMeta)
      setLcTemplate(hydratedTemplate)
      setLcFields(hydratedFields)
      setManualData({})
      setPendingManual(null)
      setAdditionalManualFields(
        (hydratedTemplate.fieldMappings ?? [])
          .map((mapping) => {
            const fieldDef = hydratedFields.find((field) => field.id === mapping.fieldId)
            if (!fieldDef || fieldDef.type === 'static') return null
            if ((mapping.fieldSource ?? 'student') === 'manual') return null

            const raw = resolveDocumentFieldValue({
              mapping,
              fieldDef,
              student: activeStudent,
              settings,
              manualData: {},
            })

            if (!isEmptyDocumentValue(raw)) return null

            return {
              fieldId: mapping.fieldId,
              key: fieldDef.key,
              label: fieldDef.label,
              inputType: fieldDef.type === 'date' ? 'date' : fieldDef.type === 'textarea' ? 'textarea' : 'text',
              required: mapping.required ?? false,
            }
          })
          .filter(Boolean)
      )
      setShowManualModal(true)
    } catch (err) {
      console.error(`${docMeta.type} load error:`, err)
      showToast(docMeta.loadError, 'error')
    }
  }

  const handleGenerateLC = () => loadDocumentTemplate(DOCUMENT_META.lc)

  const handleGenerateBonafide = () => loadDocumentTemplate(DOCUMENT_META.bonafide)

  const handleEditStudent = () => {
    navigate(`/students/${id}/edit`)
  }

  const handlePreviewAdmissionForm = async () => {
    if (!instituteId) return showToast('No institute selected', 'error')
    const flds = await getFields(instituteId)
    setAdmissionFields(flds.filter(isCustomStudentProfileField))
    setShowAdmissionPreview(true)
  }

  // Called when ManualFieldsModal submits
  const handleManualSubmit = (data) => {
    setManualData(data)
    setShowManualModal(false)
    setPendingManual(data)
    setShowValidation(true)   // Phase 8: run validation before preview
  }

  // Called when ValidationWarningModal says "Proceed Anyway"
  const handleValidationProceed = () => {
    setShowValidation(false)
    setShowNewLCPreview(true)
  }

  // Old PDF fallback (Phase 7) â€” delegates to existing LCPreview download
  // Phase 8 â€” validation (runs reactively once pendingManual is set)
  const { errors: valErrors, warnings: valWarnings } = useDocumentValidation({
    template:   lcTemplate,
    fields:     lcFields,
    student:    activeStudent,
    settings,
    manualData: pendingManual ?? {},
  })

  if (loading && !activeStudent) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!activeStudent) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-500 dark:text-gray-400">Student not found</p>
        <button onClick={() => navigate('/students')} className="btn-secondary">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </button>
      </div>
    )
  }

  const s    = activeStudent
  const fee  = s.fee
  const name = s.dynamicFields?.studentName ?? 'Student'
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/students')} className="btn-secondary p-2">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {s.class && `Class ${s.class}`}
            {s.rollNumber && ` Â· Roll ${s.rollNumber}`}
            {s.academicYear && ` Â· ${s.academicYear}`}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleGenerateLC}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            title="Generate Leaving Certificate"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Generate LC</span>
          </button>

          <button
            onClick={handleGenerateBonafide}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition-colors"
            title="Generate Bonafide Certificate"
          >
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Generate Bonafide</span>
          </button>

          <button
            onClick={handleEditStudent}
            className="btn-secondary p-2"
            title="Edit student"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleDelete}
            className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2"
            title="Delete student"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left â€” Student Info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Profile card */}
          <div className="card p-5">
            <div className="flex items-start gap-4 mb-4">
              {/* Photo */}
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0">
                {s.dynamicFields?.photo
                  ? <img src={s.dynamicFields.photo} alt={name} className="w-full h-full object-cover" />
                  : <span className="text-xl font-bold text-primary-700 dark:text-primary-400">{initials}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{name}</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className={clsx(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                    s.status === 'active'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}>
                    {s.status}
                  </span>
                  {s.board && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                      {s.board}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Personal info rows */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Personal</span>
              </div>
              <InfoRow label="Date of Birth" value={s.dynamicFields?.dateOfBirth} />
              <InfoRow label="Gender"        value={s.dynamicFields?.gender} />
              {Object.entries(s.dynamicFields ?? {})
                .filter(([k]) => !['studentName','dateOfBirth','gender','photo'].includes(k) && isStudentDynamicFieldKey(k))
                .map(([k, v]) => (
                  <InfoRow key={k} label={formatDynamicFieldLabel(k)} value={typeof v === 'string' && v.startsWith('data:') ? '[Image]' : String(v)} />
                ))
              }
            </div>

            {/* Academic info rows */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Academic</span>
              </div>
              <InfoRow label="Roll Number"   value={s.rollNumber} />
              <InfoRow label="Class"         value={s.class} />
              <InfoRow label="Medium"        value={s.medium} />
              <InfoRow label="Board"         value={s.board} />
              <InfoRow label="Academic Year" value={s.academicYear} />
            </div>
          </div>

          {/* Installment history */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Payment History</h3>
              <span className="ml-auto text-xs text-gray-400">{fee?.installments?.length ?? 0} payments</span>
            </div>

            {!fee?.installments?.length ? (
              <p className="text-sm text-gray-400 text-center py-6">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {[...(fee.installments)].reverse().map((inst, idx) => (
                  <div key={inst.id ?? idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(inst.amount)}
                        </span>
                        <span className="text-xs text-gray-400">{inst.paymentMode}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {inst.date}
                        {inst.receiptNumber && (
                          <span className="ml-2 font-mono text-primary-600 dark:text-primary-400">
                            {inst.receiptNumber}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      #{fee.installments.length - idx}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right â€” Fee card */}
        <div className="space-y-4">
          <FeeCard
            fee={fee}
            onCollect={() => setShowModal(true)}
          />

          {/* Quick stats */}
          {fee && (
            <div className="card p-4 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Fee Breakdown</p>
              {[
                { label: 'Total Fee',    val: formatCurrency(fee.totalFee),        color: '' },
                { label: 'Discount',     val: `âˆ’ ${formatCurrency(fee.discount)}`, color: 'text-red-500' },
                { label: 'Effective',    val: formatCurrency(fee.effectiveFee),    color: 'font-bold' },
                { label: 'Paid',         val: formatCurrency(fee.paidAmount),      color: 'text-green-600 dark:text-green-400 font-bold' },
                { label: 'Remaining',    val: formatCurrency(fee.remainingAmount), color: fee.remainingAmount > 0 ? 'text-red-600 dark:text-red-400 font-bold' : 'text-green-600 dark:text-green-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">{label}</span>
                  <span className={clsx('text-gray-900 dark:text-white', color)}>{val}</span>
                </div>
              ))}
            </div>
          )}

          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Documents</p>
            <div className="space-y-3">
              <button
                onClick={handlePreviewAdmissionForm}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Admission Form</p>
                  <p className="text-xs text-blue-500 dark:text-blue-400">Preview, Print or Save PDF</p>
                </div>
              </button>

              <button
                onClick={handleGenerateLC}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">Leaving Certificate</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">Preview, Print or Download PDF</p>
                </div>
              </button>

              <button
                onClick={handleGenerateBonafide}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 border border-amber-200 dark:border-amber-800 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Bonafide Certificate</p>
                  <p className="text-xs text-amber-500 dark:text-amber-400">Preview, Print or Download PDF</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Installment modal */}
      {showModal && (
        <InstallmentModal
          student={s}
          fee={fee}
          onSubmit={handleCollect}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Phase 6 â€” Manual fields modal (new renderer path) */}
      {showManualModal && lcTemplate && (
        <ManualFieldsModal
          template={lcTemplate}
          fields={lcFields}
          docLabel={activeDocMeta?.label ?? 'Document'}
          additionalFields={additionalManualFields}
          initialData={manualData}
          onSubmit={handleManualSubmit}
          onClose={() => setShowManualModal(false)}
        />
      )}

      {/* Phase 8 â€” Validation warnings */}
      {showValidation && (
        <ValidationWarningModal
          errors={valErrors}
          warnings={valWarnings}
          onProceed={handleValidationProceed}
          onClose={() => setShowValidation(false)}
        />
      )}

      {/* Phase 6+7 â€” New unified LC preview */}
      {showNewLCPreview && lcTemplate && (
        <NewLCPreview
          template={lcTemplate}
          fields={lcFields}
          student={s}
          settings={settings}
          manualData={manualData}
          title={activeDocMeta?.title}
          onClose={() => setShowNewLCPreview(false)}
        />
      )}

      {showAdmissionPreview && (
        <AdmissionFormPreview
          student={s}
          fee={fee}
          settings={settings}
          fields={admissionFields}
          onClose={() => setShowAdmissionPreview(false)}
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




