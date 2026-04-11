/**
 * TemplateBuilder.jsx — Simple Clean Version with Header Config
 *
 * Flow:
 *  1. Opening screen -> 3 cards (LC / Bonafide / Admission)
 *  2. Editor:
 *     Left panel: Header Config (sliders) + Body Fields list
 *     Right: Live Preview
 *
 * Header/Footer → Settings मधून auto. User फक्त size/position change करतो.
 * Body → Simple ordered list, up/down buttons, add/remove.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  FileText, Award, LayoutTemplate,
  ArrowLeft, Eye, EyeOff, Save, Trash2,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, X,
  CheckCircle, Star, Loader2, AlertCircle,
  GraduationCap, Settings2,
} from 'lucide-react'
import useTemplateStore from '../store/useTemplateStore'
import useFieldStore    from '../store/useFieldStore'
import useAppStore      from '../store/useAppStore'
import useSettingsStore from '../store/useSettingsStore'
import DocumentRenderer from '../components/DocumentRenderer'
import LCDocumentLayout from '../components/lc/LCDocumentLayout'
import { DEFAULT_HEADER_CONFIG, HEADER_ALIGNMENTS } from '../utils/headerConfig'
import { PAGE_SIZE_OPTIONS } from '../utils/pageSizes'
import { MOCK_MANUAL, MOCK_SETTINGS, MOCK_STUDENT } from '../utils/mockData'
import { buildReceiptTemplateSettings, buildReceiptTemplateStudent } from '../utils/receiptTemplateData'
import { ensureLcBonafidePrintFields } from '../utils/documentTemplateDefaults'
import {
  ADMISSION_ALWAYS_INCLUDED_FIELDS,
  ADMISSION_OPTIONAL_FIELDS,
  getAdmissionSelectableFields,
  countSelectedAdmissionFields,
  getSelectedAdmissionFieldKeys,
} from '../utils/admissionFieldCatalog'
import clsx             from 'clsx'

// ── Constants ─────────────────────────────────────────────────────────────

const TEMPLATE_TYPES = [
  { type: 'lc',       label: 'Leaving Certificate',  subtitle: 'Student exit document',       icon: FileText, color: 'indigo', fields: 22 },
  { type: 'bonafide', label: 'Bonafide Certificate',  subtitle: 'Proof of enrollment',         icon: Award,    color: 'amber',  fields: 10 },
  { type: 'admission', label: 'Admission Form',       subtitle: 'Choose Add Student fields',   icon: GraduationCap, color: 'blue', fields: ADMISSION_OPTIONAL_FIELDS.length },
]

const COLOR = {
  indigo: { card: 'border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-100', icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  amber:  { card: 'border-amber-200  hover:border-amber-400  hover:shadow-amber-100',  icon: 'bg-amber-100  text-amber-600',  badge: 'bg-amber-100  text-amber-700'  },
  green:  { card: 'border-green-200  hover:border-green-400  hover:shadow-green-100',  icon: 'bg-green-100  text-green-600',  badge: 'bg-green-100  text-green-700'  },
  blue:   { card: 'border-blue-200   hover:border-blue-400   hover:shadow-blue-100',   icon: 'bg-blue-100   text-blue-600',   badge: 'bg-blue-100   text-blue-700'   },
}

const SETTINGS_KEYS = new Set(['schoolName','address','logo','udiseCode','boardName','phone','principalName','clerkName','signature','stamp'])
const MANUAL_KEYS   = new Set(['reasonForLeaving','remark','dateOfIssue','purpose'])
const REQUIRED_KEYS = new Set(['studentName','dateOfBirth'])
const AUTO_MAPPING_PROPS = {
  width: 25,
  height: 5,
  fontSize: 12,
  fontWeight: 'normal',
  color: '#000000',
}

function getFieldSource(key) {
  if (SETTINGS_KEYS.has(key)) return 'settings'
  if (MANUAL_KEYS.has(key))   return 'manual'
  return 'student'
}

function getDefaultInputType(field) {
  if (field?.type === 'date') return 'date'
  if (field?.type === 'textarea') return 'textarea'
  return 'text'
}

function ensureTemplateHasAllBodyFields(template, fields = []) {
  if (!template) return { template, fields, missingCount: 0 }

  const nextMappings = [...(template.fieldMappings ?? [])]
  const mappedIds = new Set(nextMappings.map((mapping) => mapping.fieldId))
  let nextY = nextMappings.length
  let appended = 0

  fields.forEach((field) => {
    if (!field || field.deletedAt) return
    if (field.type === 'static') return
    if (SETTINGS_KEYS.has(field.key)) return
    if (mappedIds.has(field.id)) return

    nextMappings.push({
      fieldId: field.id,
      x: 10,
      y: Math.min(10 + nextY * 6, 90),
      ...AUTO_MAPPING_PROPS,
      height: field.type === 'textarea' ? 8 : field.type === 'image' ? 12 : AUTO_MAPPING_PROPS.height,
      zIndex: nextMappings.length + 1,
      fieldSource: getFieldSource(field.key),
      inputType: getDefaultInputType(field),
      required: Boolean(field.validation?.required),
    })

    mappedIds.add(field.id)
    nextY += 1
    appended += 1
  })

  if (appended === 0) return { template, fields, missingCount: 0 }

  return {
    template: {
      ...template,
      fieldMappings: nextMappings,
    },
    fields,
    missingCount: appended,
  }
}

// ── Opening Screen ────────────────────────────────────────────────────────

function TypeSelector({ templates, fields, onSelect, loading }) {
  return (
    <div className="flex flex-col items-center justify-center gap-10 py-12">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
          <LayoutTemplate className="w-7 h-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Template Builder</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Header आणि Footer Settings मधून automatically येतो.
          फक्त Body fields आणि Header size customize करा.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 w-full max-w-5xl px-4">
        {TEMPLATE_TYPES.map(t => {
          const existing = templates.find(x => x.type === t.type && !x.deletedAt)
          const isAdmission = t.type === 'admission'
          const isActive = !isAdmission && existing?.isActive === true
          const admissionCount = isAdmission ? countSelectedAdmissionFields(fields) : 0
          const Icon = t.icon
          const c = COLOR[t.color]
          return (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              disabled={loading}
              className={clsx(
                'relative flex flex-col items-center text-center gap-4 p-6 rounded-2xl border-2',
                'bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                c.card,
              )}
            >
              {isActive && (
                <span className="absolute top-3 right-3 flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Active
                </span>
              )}
              <div className={clsx('w-14 h-14 rounded-2xl flex items-center justify-center', c.icon)}>
                {loading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Icon className="w-7 h-7" />}
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-gray-900 dark:text-white">{t.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{t.subtitle}</p>
              </div>
              <span className={clsx('text-xs font-medium px-3 py-1 rounded-full', c.badge)}>
                {existing ? `Edit · ${existing.fieldMappings?.length ?? 0} fields` : `Create · ${t.fields} fields`}
              </span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-400">★ Active template generate करताना वापरला जातो.</p>
    </div>
  )
}

// ── Header Config Panel ───────────────────────────────────────────────────

function HeaderConfigPanel({ config, onChange, pageSize = 'A4', onPageSizeChange }) {
  const set = (key, value) => onChange({ ...config, [key]: value })

  const SliderRow = ({ label, cfgKey, min, max, step = 1, suffix = 'px' }) => (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-600 dark:text-gray-400">{label}</label>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{config[cfgKey]}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={config[cfgKey]}
        onChange={e => set(cfgKey, Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-gray-200 dark:bg-gray-700 accent-primary-600"
      />
    </div>
  )

  const AlignRow = ({ label, cfgKey }) => (
    <div>
      <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">{label}</label>
      <div className="flex gap-1">
        {HEADER_ALIGNMENTS.map(pos => (
          <button
            key={pos}
            onClick={() => set(cfgKey, pos)}
            className={clsx(
              'flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
              config[cfgKey] === pos
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
            )}
          >
            {pos}
          </button>
        ))}
      </div>
    </div>
  )

  const Toggle = ({ label, cfgKey }) => (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      <div
        onClick={() => set(cfgKey, !config[cfgKey])}
        className={clsx(
          'relative w-9 h-5 rounded-full transition-colors cursor-pointer',
          config[cfgKey] ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600',
        )}
      >
        <div className={clsx(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          config[cfgKey] ? 'translate-x-4' : 'translate-x-0.5',
        )} />
      </div>
    </label>
  )

  const NumberStepRow = ({ label, cfgKey, step = 1, suffix = 'px', axis = 'x' }) => {
    const rawValue = Number(config[cfgKey] ?? 0)
    const value = Number.isFinite(rawValue) ? rawValue : 0
    const changeBy = (delta) => set(cfgKey, value + delta)

    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-600 dark:text-gray-400">{label}</label>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{value}{suffix}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeBy(-step)}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {axis === 'x' ? <ChevronLeft className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <input
            type="number"
            value={value}
            step={step}
            onChange={(e) => set(cfgKey, Number(e.target.value || 0))}
            className="input text-center font-mono"
          />
          <button
            type="button"
            onClick={() => changeBy(step)}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {axis === 'x' ? <ChevronRight className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Settings2 className="w-4 h-4 text-gray-400" />
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Header Settings</p>
      </div>

      {/* Logo settings */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Canvas Size</p>
        <div className="grid grid-cols-2 gap-2">
          {PAGE_SIZE_OPTIONS.map((size) => (
            <button
              key={size}
              onClick={() => onPageSizeChange?.(size)}
              className={clsx(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                pageSize === size
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800'
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Logo</p>
        <Toggle label="Logo दाखवा" cfgKey="showLogo" />
        {config.showLogo && (
          <>
            <SliderRow label="Logo Size" cfgKey="logoSize" min={32} max={120} />
            <NumberStepRow label="Logo X Offset" cfgKey="logoOffsetX" step={5} axis="x" />
            <NumberStepRow label="Logo Y Offset" cfgKey="logoOffsetY" step={5} axis="y" />
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400 block mb-1">Logo Position</label>
              <div className="flex gap-1">
                {HEADER_ALIGNMENTS.map(pos => (
                  <button
                    key={pos}
                    onClick={() => set('logoPosition', pos)}
                    className={clsx(
                      'flex-1 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                      config.logoPosition === pos
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Text sizes */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">School Name</p>
        <SliderRow label="School Name" cfgKey="schoolNameSize" min={14} max={36} />
        <Toggle label="Curved School Name" cfgKey="schoolNameCurved" />
        {config.schoolNameCurved && (
          <NumberStepRow label="Curve Depth" cfgKey="schoolNameCurveDepth" step={4} axis="y" />
        )}
        <AlignRow label="Name Align" cfgKey="schoolNameAlign" />
        <NumberStepRow label="Name X Offset" cfgKey="schoolNameOffsetX" step={5} axis="x" />
        <NumberStepRow label="Name Y Offset" cfgKey="schoolNameOffsetY" step={5} axis="y" />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Address</p>
        <Toggle label="Address दाखवा" cfgKey="showAddress" />
        {config.showAddress && (
          <>
            <SliderRow label="Address Size" cfgKey="addressSize" min={8} max={16} />
            <AlignRow label="Address Align" cfgKey="addressAlign" />
            <NumberStepRow label="Address X Offset" cfgKey="addressOffsetX" step={5} axis="x" />
            <NumberStepRow label="Address Y Offset" cfgKey="addressOffsetY" step={5} axis="y" />
          </>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Meta Line</p>
        <Toggle label="Board/UDISE/Ph दाखवा" cfgKey="showMeta" />
        {config.showMeta && (
          <>
            <SliderRow label="Meta Size" cfgKey="metaSize" min={7} max={14} />
            <AlignRow label="Meta Align" cfgKey="metaAlign" />
            <NumberStepRow label="Meta X Offset" cfgKey="metaOffsetX" step={5} axis="x" />
            <NumberStepRow label="Meta Y Offset" cfgKey="metaOffsetY" step={5} axis="y" />
          </>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Certificate Title</p>
        <SliderRow label="Title Size" cfgKey="titleSize" min={12} max={28} />
        <AlignRow label="Title Align" cfgKey="titleAlign" />
        <NumberStepRow label="Title X Offset" cfgKey="titleOffsetX" step={5} axis="x" />
        <NumberStepRow label="Title Y Offset" cfgKey="titleOffsetY" step={5} axis="y" />
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Spacing</p>
        <SliderRow label="Top Padding" cfgKey="paddingTop" min={4} max={20} suffix="mm" />
      </div>

      {/* Reset */}
      <button
        onClick={() => onChange(DEFAULT_HEADER_CONFIG)}
        className="w-full text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1.5 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg transition-colors"
      >
        Reset to Default
      </button>
    </div>
  )
}

// ── Field Row ─────────────────────────────────────────────────────────────

function FieldRow({ mapping, field, index, total, onMoveUp, onMoveDown, onRemove, isRequired }) {
  const source = mapping.fieldSource ?? getFieldSource(field?.key ?? '')
  const srcCls = {
    student:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    settings: 'bg-blue-100  dark:bg-blue-900/30  text-blue-700  dark:text-blue-300',
    manual:   'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  }
  const srcLabel = { student: 'Student', settings: 'Settings', manual: 'Manual' }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
      <div className="flex flex-col gap-0.5 shrink-0">
        <button onClick={onMoveUp}   disabled={index === 0}         className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-colors"><ChevronUp   className="w-3 h-3 text-gray-400" /></button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-20 transition-colors"><ChevronDown className="w-3 h-3 text-gray-400" /></button>
      </div>
      <span className="text-xs text-gray-400 font-mono w-5 text-center shrink-0">{index + 1}</span>
      <span className="flex-1 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
        {field?.label ?? mapping.fieldId}
      </span>
      <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium shrink-0', srcCls[source])}>
        {srcLabel[source]}
      </span>
      {isRequired
        ? <span title="Required — cannot remove" className="shrink-0 p-1"><CheckCircle className="w-4 h-4 text-green-500" /></span>
        : <button onClick={onRemove} className="shrink-0 p-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
      }
    </div>
  )
}

// ── Add Field Panel ───────────────────────────────────────────────────────

function AddFieldPanel({ fields, templateMappings, onAdd }) {
  const [open, setOpen] = useState(false)
  const addedIds = new Set(templateMappings.map(m => m.fieldId))
  const available = fields.filter(f => !SETTINGS_KEYS.has(f.key) && !addedIds.has(f.id) && f.type !== 'static')

  if (available.length === 0) return (
    <p className="text-xs text-gray-400 text-center py-2">सगळे fields add झाले</p>
  )

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <Plus className="w-4 h-4" /> Field Add करा
      </button>
      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 z-10 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-lg max-h-48 overflow-y-auto">
          {available.map(f => {
            const src = getFieldSource(f.key)
            const srcColor = { student: 'text-green-500', settings: 'text-blue-500', manual: 'text-orange-500' }[src]
            return (
              <button
                key={f.id}
                onClick={() => { onAdd(f); setOpen(false) }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="flex-1 text-gray-800 dark:text-gray-200">{f.label}</span>
                <span className={clsx('text-xs font-medium', srcColor)}>{src}</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Live Preview ──────────────────────────────────────────────────────────

function LivePreview({ template, fields, settings, docType, headerConfig }) {
  const mockStudent = MOCK_STUDENT
  const mockManual = MOCK_MANUAL
  const mockSettings = settings ?? MOCK_SETTINGS
  const mockReceiptStudent = buildReceiptTemplateStudent({
    student: MOCK_STUDENT,
    receipt: {
      id: 'mock-receipt',
      receiptNumber: MOCK_STUDENT.dynamicFields.receiptNo,
      amount: MOCK_STUDENT.dynamicFields.amountPaid,
      paymentDate: MOCK_STUDENT.dynamicFields.receiptDate,
      paymentMode: MOCK_STUDENT.dynamicFields.paymentMode,
      installmentNumber: 1,
    },
    fee: {
      totalFee: 32000,
      discount: 2000,
      paidAmount: 12000,
      remainingAmount: MOCK_STUDENT.dynamicFields.remainingBalance,
    },
  })
  const receiptSettings = buildReceiptTemplateSettings(mockSettings)

  const title = docType === 'bonafide' ? 'BONAFIDE CERTIFICATE' : docType === 'receipt' ? 'FEE RECEIPT' : 'SCHOOL LEAVING CERTIFICATE'
  const previewTemplate = template
    ? { ...template, headerConfig }
    : null

  if (docType === 'lc' || docType === 'bonafide') {
    return (
      <LCDocumentLayout
        template={previewTemplate}
        fields={fields}
        student={mockStudent}
        settings={mockSettings}
        manualData={mockManual}
        title={title}
        mode="preview"
        showFrame
      />
    )
  }

  return (
    <DocumentRenderer
      template={previewTemplate}
      fields={fields}
      student={mockReceiptStudent}
      settings={receiptSettings}
      mode="preview"
      pageSize={previewTemplate?.pageSize ?? 'A4'}
    />
  )
}

function AdmissionTypeSelector({ templates, fields, onSelect, loading }) {
  return (
    <div className="flex flex-col items-center justify-center gap-10 py-12">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mb-4">
          <LayoutTemplate className="w-7 h-7 text-primary-600 dark:text-primary-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Template Builder</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
          Header and footer settings auto load hotat. Body fields ani Add Student admission fields ithe customize kara.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 w-full max-w-5xl px-4 md:grid-cols-2 xl:grid-cols-4">
        {TEMPLATE_TYPES.map((t) => {
          const existing = templates.find((x) => x.type === t.type && !x.deletedAt)
          const isAdmission = t.type === 'admission'
          const isActive = !isAdmission && existing?.isActive === true
          const Icon = t.icon
          const c = COLOR[t.color]
          const badgeLabel = isAdmission
            ? `${countSelectedAdmissionFields(fields)} optional fields enabled`
            : existing
              ? `Edit · ${existing.fieldMappings?.length ?? 0} fields`
              : `Create · ${t.fields} fields`

          return (
            <button
              key={t.type}
              onClick={() => onSelect(t.type)}
              disabled={loading}
              className={clsx(
                'relative flex flex-col items-center gap-4 rounded-2xl border-2 p-6 text-center',
                'bg-white shadow-sm transition-all duration-200 hover:shadow-lg dark:bg-gray-900',
                'disabled:cursor-not-allowed disabled:opacity-50',
                c.card,
              )}
            >
              {isActive && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Active
                </span>
              )}
              <div className={clsx('flex h-14 w-14 items-center justify-center rounded-2xl', c.icon)}>
                {loading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Icon className="h-7 w-7" />}
              </div>
              <div className="space-y-1">
                <p className="text-base font-bold text-gray-900 dark:text-white">{t.label}</p>
                <p className="text-xs leading-relaxed text-gray-500 dark:text-gray-400">{t.subtitle}</p>
              </div>
              <span className={clsx('rounded-full px-3 py-1 text-xs font-medium', c.badge)}>
                {badgeLabel}
              </span>
            </button>
          )
        })}
      </div>

      <p className="text-xs text-gray-400">
        Active document template generate करताना वापरला जातो. Admission Form card Add Student fields control करतो.
      </p>
    </div>
  )
}

function AdmissionFieldSelector({ fields, selectedKeys, onToggle, onSelectAll, onClear }) {
  const selected = new Set(selectedKeys)
  const selectableFields = getAdmissionSelectableFields(fields)
  const predefinedFields = selectableFields.filter((field) => !field.isCustom)
  const customFields = selectableFields.filter((field) => field.isCustom)

  const getTypeLabel = (field) => (
    field.type === 'date'
      ? 'Date'
      : field.type === 'textarea'
        ? 'Textarea'
        : field.type === 'select'
          ? 'Dropdown'
          : field.type === 'number'
            ? 'Number'
            : field.type === 'image'
              ? 'Image'
              : 'Text'
  )

  const renderSelectableField = (field, activeClass, inactiveClass, badgeClass) => {
    const checked = selected.has(field.key)

    return (
      <label
        key={field.key}
        className={clsx(
          'flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors',
          checked ? activeClass : inactiveClass
        )}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(field.key)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</span>
            {field.sources.map((source) => (
              <span
                key={`${field.key}-${source}`}
                className={badgeClass}
              >
                {source}
              </span>
            ))}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Type: {getTypeLabel(field)}
          </p>
        </div>
      </label>
    )
  }

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Admission Form Fields</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            School checkbox choose करेल ते fields `Add Student` मधल्या Personal Information section मध्ये दिसतील.
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {selectedKeys.length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Clear Optional
        </button>
      </div>

      <div className="space-y-2">
        {predefinedFields.map((field) => renderSelectableField(
          field,
          'border-blue-300 bg-blue-50/80 dark:border-blue-700 dark:bg-blue-900/20',
          'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700',
          'rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300'
        ))}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Custom Form Builder Fields</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Form Builder madhe navin field create kelat ki te ithe disel. Tick kelavarach Add Student madhye yeil.
          </p>
        </div>

        {customFields.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center text-xs text-gray-400 dark:border-gray-700">
            Ajun custom fields nahi. Form Builder madhe field add kara.
          </div>
        ) : (
          customFields.map((field) => renderSelectableField(
            field,
            'border-emerald-300 bg-emerald-50/80 dark:border-emerald-700 dark:bg-emerald-900/20',
            'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-700',
            'rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
          ))
        )}
      </div>
    </div>
  )
}

function AdmissionPreview({ fields, selectedKeys }) {
  const selected = getAdmissionSelectableFields(fields).filter((field) => selectedKeys.includes(field.key))
  const selectedPredefined = selected.filter((field) => !field.isCustom)
  const selectedCustom = selected.filter((field) => field.isCustom)

  return (
    <div className="space-y-4">
      <div className="text-xs text-gray-400 text-center">Add Student Preview</div>

      <div className="card p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Always Included</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            हे fields already Add Student मध्ये आहेत, म्हणून checkbox ची गरज नाही.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ADMISSION_ALWAYS_INCLUDED_FIELDS.map((label) => (
            <span
              key={label}
              className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">Selected Optional Fields</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Save केल्यावर हे fields `Add Student` च्या Personal Information मध्ये दिसतील.
          </p>
        </div>

        {selected.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400 dark:border-gray-700">
            Optional field select केल्यावर preview इथे दिसेल.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {selectedPredefined.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</p>
                  {field.sources.map((source) => (
                    <span
                      key={`${field.key}-preview-${source}`}
                      className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                    >
                      {source}
                    </span>
                  ))}
                </div>
                <div className="mt-2 h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-gray-800" />
              </div>
            ))}

            {selectedCustom.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-3 dark:border-emerald-800 dark:bg-gray-900"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{field.label}</p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    Form Builder
                  </span>
                </div>
                <div className="mt-2 h-10 rounded-lg border border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-gray-800" />
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
          Fee Setup section मधले `Total Fee` आणि `Discount` fields नेहमी available राहतील.
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function TemplateBuilder() {
  const { currentInstituteId } = useAppStore()
  const {
    templates, activeTemplate, loading,
    loadTemplates, setActiveTemplate, createPresetTemplate,
    saveTemplate, deleteTemplate, addFieldToCanvas,
    removeFieldFromCanvas, updateActiveTemplate, markTemplateActive, clearTemplateActive,
  } = useTemplateStore()
  const { fields, loadFields }     = useFieldStore()
  const { settings, loadSettings } = useSettingsStore()

  const [selectedType,  setSelectedType]  = useState(null)
  const [isDirty,       setIsDirty]       = useState(false)
  const [isCreating,    setIsCreating]    = useState(false)
  const [toast,         setToast]         = useState(null)
  const [headerConfig,  setHeaderConfig]  = useState(DEFAULT_HEADER_CONFIG)
  const [leftPanelTab,  setLeftPanelTab]  = useState('header')
  const [isSaving,      setIsSaving]      = useState(false)
  const [admissionSelection, setAdmissionSelection] = useState([])

  const instituteId = currentInstituteId || null

  useEffect(() => {
    if (!instituteId) return
    loadTemplates(instituteId)
    loadFields(instituteId)
    loadSettings(instituteId)
  }, [instituteId])

  // Load headerConfig from template when activeTemplate changes
  useEffect(() => {
    if (activeTemplate?.headerConfig) {
      setHeaderConfig({ ...DEFAULT_HEADER_CONFIG, ...activeTemplate.headerConfig })
    } else {
      setHeaderConfig(DEFAULT_HEADER_CONFIG)
    }
  }, [activeTemplate?.id])

  useEffect(() => {
    if (selectedType !== 'admission' || isDirty) return
    setAdmissionSelection(getSelectedAdmissionFieldKeys(fields))
  }, [selectedType, fields, isDirty])

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleTypeSelect = useCallback(async (type) => {
    if (!instituteId) return
    if (type === 'admission') {
      setSelectedType(type)
      setActiveTemplate(null)
      setAdmissionSelection(getSelectedAdmissionFieldKeys(fields))
      setIsDirty(false)
      return
    }
    setIsCreating(true)
    try {
      const existing = templates.find(t => t.type === type && !t.deletedAt)
      if (existing) {
        setActiveTemplate(existing)
      } else {
        const result = await createPresetTemplate(instituteId, type, fields)
        await markTemplateActive(result.template.id)
        await loadFields(instituteId)
        showToast(`${result.template.name} तयार झाला`)
      }
      setSelectedType(type)
      setLeftPanelTab('header')
      setIsDirty(false)
    } catch (err) {
      console.error(err)
      showToast('Template load failed', 'error')
    } finally {
      setIsCreating(false)
    }
  }, [instituteId, templates, fields, setActiveTemplate])

  const handleBack = useCallback(() => {
    if (isDirty && !confirm('Changes discard होतील. Continue?')) return
    setSelectedType(null)
    setActiveTemplate(null)
    setIsDirty(false)
  }, [isDirty])

  const handleSave = useCallback(async () => {
    if (selectedType === 'admission') {
      if (!instituteId) return
      setIsSaving(true)
      try {
        const selectedKeys = new Set(admissionSelection)
        const currentFields = useFieldStore.getState().fields
        const selectableKeys = new Set(
          getAdmissionSelectableFields(currentFields).map((field) => field.key)
        )
        let nextOrder =
          currentFields.reduce((max, field) => Math.max(max, field.meta?.order ?? -1), -1) + 1

        for (const config of ADMISSION_OPTIONAL_FIELDS) {
          const existing = currentFields.find((field) => field.key === config.key && !field.deletedAt)
          const shouldShow = selectedKeys.has(config.key)

          if (!existing && shouldShow) {
            await useFieldStore.getState().addField({
              id: crypto.randomUUID(),
              label: config.label,
              key: config.key,
              type: config.type,
              options: [],
              validation: { ...(config.validation ?? {}) },
              meta: {
                system: false,
                order: nextOrder++,
                admissionManaged: true,
                showInAdmissionForm: true,
              },
              instituteId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              deletedAt: null,
            })
            continue
          }

          if (existing) {
            const nextMeta = {
              ...(existing.meta ?? {}),
              admissionManaged: true,
              showInAdmissionForm: shouldShow,
            }
            const wasVisible = existing.meta?.showInAdmissionForm !== false
            const wasManaged = existing.meta?.admissionManaged === true
            if (wasVisible !== shouldShow || !wasManaged) {
              await useFieldStore.getState().updateField(existing.id, { meta: nextMeta })
            }
          }
        }

        for (const field of currentFields) {
          if (!selectableKeys.has(field.key)) continue
          if (ADMISSION_OPTIONAL_FIELDS.some((config) => config.key === field.key)) continue

          const shouldShow = selectedKeys.has(field.key)
          const nextMeta = {
            ...(field.meta ?? {}),
            showInAdmissionForm: shouldShow,
          }
          const wasVisible = field.meta?.showInAdmissionForm !== false

          if (wasVisible !== shouldShow) {
            await useFieldStore.getState().updateField(field.id, { meta: nextMeta })
          }
        }

        setIsDirty(false)
        showToast('Admission form updated')
      } catch (err) {
        console.error(err)
        showToast(err.message || 'Admission form save failed', 'error')
      } finally {
        setIsSaving(false)
      }
      return
    }

    // Save headerConfig into template before saving
    updateActiveTemplate({ headerConfig })
    const saved = await saveTemplate()
    if (saved) {
      await markTemplateActive(saved.id)
      setIsDirty(false)
      showToast('Template saved ✓')
    }
  }, [selectedType, instituteId, admissionSelection, saveTemplate, markTemplateActive, updateActiveTemplate, headerConfig])

  const handleDelete = useCallback(async () => {
    if (!activeTemplate) return
    if (!confirm(`"${activeTemplate.name}" delete करायचा?`)) return
    await deleteTemplate(activeTemplate.id)
    setSelectedType(null)
    setIsDirty(false)
    showToast('Template deleted')
  }, [activeTemplate, deleteTemplate])

  const handleSetActive = useCallback(async () => {
    if (!activeTemplate) return

    let targetId = activeTemplate.id

    if (isDirty) {
      updateActiveTemplate({ headerConfig })
      const saved = await saveTemplate()
      if (!saved) return
      targetId = saved.id
      setIsDirty(false)
    }

    await markTemplateActive(targetId)
    showToast('Active template updated')
  }, [activeTemplate, isDirty, headerConfig, updateActiveTemplate, saveTemplate, markTemplateActive])

  const handleToggleActive = useCallback(async () => {
    if (!activeTemplate) return

    if (activeTemplate.isActive) {
      await clearTemplateActive(activeTemplate.id)
      showToast('Template deactivated')
      return
    }

    await handleSetActive()
  }, [activeTemplate, clearTemplateActive, handleSetActive])

  const handleAddField = useCallback((field) => {
    addFieldToCanvas(field)
    setIsDirty(true)
  }, [addFieldToCanvas])

  const handleRemoveField = useCallback((fieldId) => {
    removeFieldFromCanvas(fieldId)
    setIsDirty(true)
  }, [removeFieldFromCanvas])

  const handleMove = useCallback((fieldId, direction) => {
    if (!activeTemplate) return
    const maps = [...activeTemplate.fieldMappings]
    const idx  = maps.findIndex(m => m.fieldId === fieldId)
    if (idx < 0) return
    const newIdx = direction === 'up' ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= maps.length) return
    ;[maps[idx], maps[newIdx]] = [maps[newIdx], maps[idx]]
    updateActiveTemplate({ fieldMappings: maps })
    setIsDirty(true)
  }, [activeTemplate, updateActiveTemplate])

  const handleHeaderConfig = useCallback((cfg) => {
    setHeaderConfig(cfg)
    setIsDirty(true)
  }, [])

  const handlePageSize = useCallback((pageSize) => {
    updateActiveTemplate({ pageSize })
    setIsDirty(true)
  }, [updateActiveTemplate])

  const handleToggleAdmissionField = useCallback((key) => {
    setAdmissionSelection((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
    setIsDirty(true)
  }, [])

  const handleSelectAllAdmissionFields = useCallback(() => {
    setAdmissionSelection(getAdmissionSelectableFields(fields).map((field) => field.key))
    setIsDirty(true)
  }, [fields])

  const handleClearAdmissionFields = useCallback(() => {
    setAdmissionSelection([])
    setIsDirty(true)
  }, [])

  const documentFieldContext = useMemo(
    () => ensureLcBonafidePrintFields(activeTemplate, fields, { includeMissingMappings: false }),
    [activeTemplate, fields]
  )
  const syncedDocumentContext = useMemo(
    () => ensureTemplateHasAllBodyFields(documentFieldContext.template ?? activeTemplate, documentFieldContext.fields),
    [activeTemplate, documentFieldContext]
  )

  useEffect(() => {
    if (!activeTemplate || selectedType === 'admission') return
    if (!syncedDocumentContext.missingCount) return
    if (!syncedDocumentContext.template?.fieldMappings) return

    updateActiveTemplate({
      fieldMappings: syncedDocumentContext.template.fieldMappings,
    })
    setIsDirty(true)
  }, [
    activeTemplate,
    selectedType,
    syncedDocumentContext,
    updateActiveTemplate,
  ])

  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <AlertCircle className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">Institute linked नाही. License activate करा.</p>
      </div>
    )
  }

  if (!selectedType) {
    return (
      <div className="h-full">
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl px-8 py-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Template load होत आहे…</p>
            </div>
          </div>
        )}
        <AdmissionTypeSelector templates={templates} fields={fields} onSelect={handleTypeSelect} loading={isCreating} />
      </div>
    )
  }

  if (selectedType === 'admission') {
    const selectedCount = admissionSelection.length

    return (
      <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 shrink-0">
          <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
          </button>
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">Admission Form</h2>
            <p className="text-xs text-gray-400">Checkbox ने fields select करा आणि Save केल्यावर ते Add Student form मध्ये दिसतील</p>
          </div>
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">Unsaved</span>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <div className="min-h-0 overflow-y-auto pr-1">
            <AdmissionFieldSelector
              fields={fields}
              selectedKeys={admissionSelection}
              onToggle={handleToggleAdmissionField}
              onSelectAll={handleSelectAllAdmissionFields}
              onClear={handleClearAdmissionFields}
            />
          </div>

          <div className="min-h-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-xl">
              <AdmissionPreview fields={fields} selectedKeys={admissionSelection} />
              <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                Total optional fields enabled: <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {toast && (
          <div className={clsx(
            'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
            toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
          )}>
            <CheckCircle className="w-4 h-4" />
            {toast.msg}
          </div>
        )}
      </div>
    )
  }

  const previewTemplate = syncedDocumentContext.template ?? activeTemplate
  const effectiveFields = syncedDocumentContext.fields ?? fields
  const typeMeta     = TEMPLATE_TYPES.find(t => t.type === selectedType)
  const mappings     = previewTemplate?.fieldMappings ?? []
  const bodyMappings = mappings.filter(m => {
    const f = effectiveFields.find(x => x.id === m.fieldId)
    return f && !SETTINGS_KEYS.has(f.key) && f.type !== 'static'
  })

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">

      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={handleBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Templates</span>
        </button>
        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{typeMeta?.label}</h2>
          <p className="text-xs text-gray-400">Header/Footer → Settings मधून · Body → इथे edit करा</p>
        </div>
        {isDirty && (
          <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800">Unsaved</span>
        )}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two column */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-0 overflow-hidden">

        {/* Left — config + fields */}
	        <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
	          <div className="grid grid-cols-2 gap-2 shrink-0">
	            <button
	              onClick={() => setLeftPanelTab('header')}
	              className={clsx(
	                'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
	                leftPanelTab === 'header'
	                  ? 'bg-primary-600 text-white'
	                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
	              )}
	            >
	              Header Settings
	            </button>
	            <button
	              onClick={() => setLeftPanelTab('body')}
	              className={clsx(
	                'rounded-xl px-3 py-2 text-sm font-medium transition-colors',
	                leftPanelTab === 'body'
	                  ? 'bg-primary-600 text-white'
	                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
	              )}
	            >
	              Body Fields
	            </button>
	          </div>
	          <div className="min-h-0 overflow-y-auto pr-1">

          {/* Header Config */}
          {leftPanelTab === 'header' && (
            <HeaderConfigPanel
              config={headerConfig}
              onChange={handleHeaderConfig}
              pageSize={activeTemplate?.pageSize ?? 'A4'}
              onPageSizeChange={handlePageSize}
            />
          )}

          {/* Body Fields */}
          {leftPanelTab === 'body' && (
	          <div className="card flex min-h-[260px] flex-col overflow-hidden p-4">
	            <div className="flex items-center justify-between mb-3">
	              <p className="text-sm font-semibold text-gray-900 dark:text-white">Body Fields</p>
	              <span className="text-xs text-gray-400">{bodyMappings.length} fields</span>
	            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {[['🟢 Student',''], ['🔵 Settings',''], ['🟠 Manual (generate वेळी)','']].map(([l]) => (
                <span key={l} className="text-xs text-gray-500 dark:text-gray-400">{l}</span>
              ))}
            </div>

	            <div className="mb-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
	              {bodyMappings.length === 0 ? (
	                <div className="text-center py-8 text-gray-400">
                  <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">Fields add करा</p>
                </div>
              ) : (
                bodyMappings.map((mapping, i) => {
                  const field  = effectiveFields.find(f => f.id === mapping.fieldId)
                  const isReq  = REQUIRED_KEYS.has(field?.key)
                  return (
                    <FieldRow
                      key={mapping.fieldId}
                      mapping={mapping}
                      field={field}
                      index={i}
                      total={bodyMappings.length}
                      onMoveUp={()   => handleMove(mapping.fieldId, 'up')}
                      onMoveDown={() => handleMove(mapping.fieldId, 'down')}
                      onRemove={()   => handleRemoveField(mapping.fieldId)}
                      isRequired={isReq}
                    />
                  )
                })
              )}
            </div>

            <AddFieldPanel fields={effectiveFields} templateMappings={mappings} onAdd={handleAddField} />
          </div>
          )}

          </div>

          {/* Active status */}
          <div className="card p-3 shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">Active Template</p>
                <p className="text-xs text-gray-400">Generate वेळी हाच वापरला जातो</p>
              </div>
              <button
                onClick={handleToggleActive}
                className={clsx(
                  'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg transition-colors',
                  activeTemplate?.isActive
                    ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                    : 'text-gray-500 hover:text-amber-500 bg-gray-100 dark:bg-gray-800'
                )}
              >
                <Star className={clsx('w-3 h-3', activeTemplate?.isActive && 'fill-amber-500')} />
                {activeTemplate?.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>
          </div>
        </div>

        {/* Right — Live Preview */}
        <div className="overflow-y-auto flex justify-center">
          <div className="w-full max-w-md">
            <div className="text-xs text-gray-400 text-center mb-2">Live Preview — Sample data सह</div>
            {isDirty && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                Header/logo changes preview मध्ये लगेच दिसतात, पण Generate LC / PDF मध्ये शेवटचा saved active templateच वापरला जातो.
              </div>
            )}
            <LivePreview
              template={previewTemplate}
              fields={effectiveFields}
              settings={settings}
              docType={selectedType}
              headerConfig={headerConfig}
            />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium',
          toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
        )}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}
    </div>
  )
}
