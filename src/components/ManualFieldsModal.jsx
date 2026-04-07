/**
 * ManualFieldsModal.jsx
 *
 * Step shown BEFORE document generation.
 * Collects values for every field in the template that has fieldSource === 'manual'
 * (e.g. reasonForLeaving, remark, dateOfIssue, purpose).
 *
 * Exports:
 *   useManualFields(template, fields)  — hook that extracts manual field specs
 *   ManualFieldsModal (default)        — the modal component
 *
 * Props (ManualFieldsModal):
 *   template   {object}    — full template object (fieldMappings[])
 *   fields     {Array}     — field definitions for the institute (from db.fields)
 *   docLabel   {string}    — e.g. "Leaving Certificate", shown in the title
 *   onSubmit   {Function}  — (manualData: { [key]: value }) => void
 *   onClose    {Function}  — () => void
 */

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FileText, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * useManualFields
 *
 * Extracts all fieldMappings where fieldSource === 'manual', enriches them
 * with the label and key from the field definition lookup, and returns a
 * stable array ready to drive a form UI.
 *
 * @param {object|null} template  — full template object
 * @param {Array}       fields    — institute field definitions (db.fields)
 * @returns {{ fields: Array, isReady: boolean }}
 *
 * Each item in the returned `fields` array:
 *   { fieldId, key, label, inputType, required }
 */
export function useManualFields(template, fields = []) {
  const manualFields = useMemo(() => {
    if (!template?.fieldMappings) return []

    return template.fieldMappings
      .filter(m => m.fieldSource === 'manual')
      .map(m => {
        const def = fields.find(f => f.id === m.fieldId)
        if (!def) return null
        return {
          fieldId:   m.fieldId,
          key:       def.key,
          label:     def.label,
          inputType: m.inputType ?? 'text',
          required:  m.required ?? false,
        }
      })
      .filter(Boolean)
  }, [template, fields])

  return {
    fields:  manualFields,
    isReady: template != null,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function buildDefaults(manualFields) {
  const data = {}
  manualFields.forEach(f => {
    // Date fields default to today; all others start empty
    data[f.key] = f.inputType === 'date' ? todayISO() : ''
  })
  return data
}

// ── Field widget ──────────────────────────────────────────────────────────────

const FieldWidget = React.forwardRef(function FieldWidget({ field, value, error, onChange }, ref) {
  const { label, inputType, required } = field
  const id = `manual-${field.key}`

  const baseInputClass = clsx(
    'input',                     // from index.css — full-width styled input
    error && 'border-red-400 dark:border-red-500 focus:ring-red-400'
  )

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {inputType === 'textarea' ? (
        <textarea
          ref={ref}
          id={id}
          rows={3}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}…`}
          className={clsx(baseInputClass, 'resize-none')}
        />
      ) : inputType === 'date' ? (
        <input
          ref={ref}
          id={id}
          type="date"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={baseInputClass}
        />
      ) : (
        <input
          ref={ref}
          id={id}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={`Enter ${label.toLowerCase()}…`}
          className={baseInputClass}
        />
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500 dark:text-red-400 mt-0.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
})

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function ManualFieldsModal({
  template,
  fields    = [],
  docLabel  = 'Document',
  additionalFields = [],
  initialData = {},
  onSubmit,
  onClose,
}) {
  const { fields: manualFields, isReady } = useManualFields(template, fields)
  const allFields = useMemo(() => {
    const seen = new Set()
    return [...manualFields, ...additionalFields].filter((field) => {
      if (!field?.key) return false
      if (seen.has(field.key)) return false
      seen.add(field.key)
      return true
    })
  }, [manualFields, additionalFields])

  const [formData, setFormData] = useState(() => buildDefaults([]))
  const [errors,   setErrors]   = useState({})
  const firstRef = useRef(null)

  // Initialise form values once manual fields are known
  useEffect(() => {
    const defaults = buildDefaults(allFields)
    setFormData({ ...defaults, ...initialData })
    setErrors({})
  }, [allFields, initialData])

  // Focus first interactive field on open
  useEffect(() => {
    if (isReady) {
      const t = setTimeout(() => firstRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [isReady])

  // Keyboard: Escape → close
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate required fields
    const newErrors = {}
    allFields.forEach(f => {
      if (f.required && !String(formData[f.key] ?? '').trim()) {
        newErrors[f.key] = `${f.label} is required`
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSubmit({ ...formData })
  }

  // ── No manual fields needed — offer immediate proceed ─────────────────────
  const hasNoFields = isReady && allFields.length === 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manual-modal-title"
        className="fixed inset-0 z-[51] flex items-center justify-center p-4"
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md flex flex-col max-h-[90vh]">

          {/* ── Header ─────────────────────────────────────────────────── */}
          <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3
                id="manual-modal-title"
                className="text-base font-semibold text-gray-900 dark:text-white"
              >
                Generate {docLabel}
              </h3>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {hasNoFields
                  ? 'No additional details required.'
                  : 'Fill in the details below before generating.'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <form
            id="manual-fields-form"
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          >
            {hasNoFields ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <CheckCircle2 className="w-10 h-10 text-green-500 dark:text-green-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  All fields will be filled automatically from the student record
                  and school settings.
                </p>
              </div>
            ) : (
              allFields.map((field, idx) => (
                <FieldWidget
                  key={field.fieldId ?? field.key}
                  field={field}
                  value={formData[field.key] ?? ''}
                  error={errors[field.key]}
                  onChange={val => handleChange(field.key, val)}
                  ref={idx === 0 ? firstRef : undefined}
                />
              ))
            )}
          </form>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="manual-fields-form"
              className="btn-primary"
            >
              Generate
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
