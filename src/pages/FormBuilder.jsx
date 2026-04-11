import React, { useEffect, useRef, useState } from 'react'
import {
  Plus, Eye, EyeOff, Database, RefreshCw,
  Layers, CheckCircle, AlertTriangle,
} from 'lucide-react'
import useFieldStore from '../store/useFieldStore'
import useAppStore from '../store/useAppStore'
import FieldCard from '../components/FieldCard'
import FieldEditorModal from '../components/FieldEditorModal'
import { createFieldDef, FIELD_TYPES, validateFieldValue } from '../utils/fieldTypes'
import clsx from 'clsx'

// ---------------------------------------------------------------------------
// Live Preview
// ---------------------------------------------------------------------------
function LivePreview({ fields }) {
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (key, value) => {
    setValues(prev => ({ ...prev, [key]: value }))
    // Clear error on change
    setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = {}
    for (const field of fields) {
      const err = validateFieldValue(field, values[field.key])
      if (err) newErrors[field.key] = err
    }
    setErrors(newErrors)
    if (Object.keys(newErrors).length === 0) setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <CheckCircle className="w-12 h-12 text-green-500" />
        <p className="text-base font-semibold text-gray-900 dark:text-white">Form submitted!</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">All validations passed.</p>
        <button onClick={() => { setSubmitted(false); setValues({}); setErrors({}) }} className="btn-secondary mt-2">
          Reset
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.length === 0 && (
        <div className="text-center py-10 text-gray-400 dark:text-gray-600 text-sm">
          Add fields on the left to see the preview here.
        </div>
      )}
      {fields.map(field => {
        const Icon = FIELD_TYPES[field.type]?.icon
        const error = errors[field.key]
        return (
          <div key={field.id}>
            <label className={clsx('label flex items-center gap-1.5 mb-1', error && 'text-red-600 dark:text-red-400')}>
              {Icon && <Icon className="w-3.5 h-3.5 text-gray-400" />}
              {field.label}
              {field.validation?.required && <span className="text-red-500">*</span>}
            </label>

            {field.type === 'text' && (
              <input
                className={clsx('input', error && 'border-red-400 dark:border-red-600 focus:ring-red-400')}
                placeholder={`Enter ${field.label.toLowerCase()}…`}
                maxLength={field.validation?.maxLength}
                value={values[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            )}
            {field.type === 'number' && (
              <input
                type="number"
                className={clsx('input', error && 'border-red-400 dark:border-red-600')}
                min={field.validation?.min ?? undefined}
                max={field.validation?.max ?? undefined}
                value={values[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            )}
            {field.type === 'date' && (
              <input
                type="date"
                className={clsx('input', error && 'border-red-400 dark:border-red-600')}
                min={field.validation?.minDate ?? undefined}
                max={field.validation?.maxDate ?? undefined}
                value={values[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            )}
            {field.type === 'select' && (
              <select
                className={clsx('input', error && 'border-red-400 dark:border-red-600')}
                value={values[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
              >
                <option value="">— Select —</option>
                {(field.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {field.type === 'textarea' && (
              <textarea
                rows={3}
                className={clsx('input resize-none', error && 'border-red-400 dark:border-red-600')}
                placeholder={`Enter ${field.label.toLowerCase()}…`}
                maxLength={field.validation?.maxLength}
                value={values[field.key] ?? ''}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            )}
            {field.type === 'image' && (
              <div className={clsx('border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                error ? 'border-red-400' : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
              )}>
                {values[field.key] ? (
                  <div className="relative">
                    <img src={values[field.key]} alt="Preview" className="h-20 w-20 object-cover rounded-lg mx-auto" />
                    <button type="button" onClick={() => handleChange(field.key, null)} className="mt-2 text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload image</p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files[0]
                        if (!file) return
                        const reader = new FileReader()
                        reader.onload = ev => handleChange(field.key, ev.target.result)
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
                )}
              </div>
            )}

            {error && (
              <p className="flex items-center gap-1 text-xs text-red-500 mt-1">
                <AlertTriangle className="w-3 h-3" /> {error}
              </p>
            )}
          </div>
        )
      })}

      {fields.length > 0 && (
        <button type="submit" className="btn-primary w-full justify-center mt-2">
          Submit Preview
        </button>
      )}
    </form>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function FormBuilder() {
  const { currentInstituteId, currentInstituteName, selectedInstitute, setSelectedInstitute } = useAppStore()
  const institutes = [] // FormBuilder ला institute switcher नको — single institute mode
  const { fields, loading, loadFields, addField, updateField, deleteField, reorderFields } = useFieldStore()

  const [showModal, setShowModal] = useState(false)
  const [editingField, setEditingField] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [toast, setToast] = useState(null)

  // Drag state
  const dragIndex = useRef(null)
  const dragOverIndex = useRef(null)

  // Resolve current institute id
  const instituteId = currentInstituteId || selectedInstitute || null

  // Load fields whenever institute changes
  useEffect(() => {
    if (!instituteId) return
    loadFields(instituteId)
  }, [instituteId])

  // Toast helper
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2500)
  }

  // ---- Drag & drop ---------------------------------------------------------
  const handleDragStart = (e, idx) => {
    dragIndex.current = idx
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragEnter = (e, idx) => {
    dragOverIndex.current = idx
  }
  const handleDragEnd = () => {
    if (dragIndex.current === null || dragOverIndex.current === null) return
    if (dragIndex.current === dragOverIndex.current) return

    const reordered = [...fields]
    const [moved] = reordered.splice(dragIndex.current, 1)
    reordered.splice(dragOverIndex.current, 0, moved)
    // Update order in meta
    const withOrder = reordered.map((f, i) => ({ ...f, meta: { ...(f.meta ?? {}), order: i } }))
    reorderFields(withOrder)
    dragIndex.current = null
    dragOverIndex.current = null
    showToast('Field order saved')
  }

  // ---- CRUD ----------------------------------------------------------------
  const handleSave = async (data) => {
    try {
      if (editingField) {
        await updateField(editingField.id, {
          label: data.label,
          key: data.key,
          type: data.type,
          options: data.options,
          validation: data.validation,
        })
        showToast('Field updated')
      } else {
        const def = createFieldDef(data.type, data.label, instituteId, fields.length)
        await addField({
          ...def,
          key: data.key,
          options: data.options,
          validation: data.validation,
        })
        showToast('Field added')
      }
      setShowModal(false)
      setEditingField(null)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleDelete = async (field) => {
    if (field.meta?.system) { showToast('System fields cannot be deleted', 'error'); return }
    if (!confirm(`Delete field "${field.label}"?`)) return
    try {
      await deleteField(field.id)
      showToast('Field deleted')
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggleRequired = async (field) => {
    await updateField(field.id, {
      validation: { ...field.validation, required: !field.validation?.required },
    })
  }

  // ---- No institute --------------------------------------------------------
  if (!instituteId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <Database className="w-12 h-12 text-gray-300 dark:text-gray-600" />
        <p className="text-gray-600 dark:text-gray-400 text-sm">No institute found. Add an institute first.</p>
      </div>
    )
  }

  const currentInstitute = { name: currentInstituteName }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Form Builder</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {fields.length} fields · {currentInstitute?.name ?? instituteId}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Institute selector */}
          {institutes.length > 1 && (
            <select
              value={instituteId}
              onChange={e => setSelectedInstitute(e.target.value)}
              className="input text-sm w-auto"
            >
              {institutes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          )}

          <button
            onClick={() => loadFields(instituteId)}
            className="btn-secondary p-2"
            title="Refresh"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
          </button>

          <button
            onClick={() => setShowPreview(p => !p)}
            className={clsx('btn-secondary', showPreview && 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 border-primary-300 dark:border-primary-700')}
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Live Preview'}
          </button>

          <button
            onClick={() => { setEditingField(null); setShowModal(true) }}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" /> Add Field
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className={clsx('grid gap-5', showPreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
        {/* Field registry */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Field Registry
            </span>
            <span className="ml-auto text-xs text-gray-400">Drag to reorder</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : fields.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
              <Database className="w-8 h-8 text-gray-300 dark:text-gray-600" />
              <p className="text-sm text-gray-400">No fields yet. Click "Add Field" to start.</p>
            </div>
          ) : (
            fields.map((field, index) => (
              <FieldCard
                key={field.id}
                field={field}
                index={index}
                onEdit={() => { setEditingField(field); setShowModal(true) }}
                onDelete={() => handleDelete(field)}
                onToggleRequired={() => handleToggleRequired(field)}
                isDragging={dragIndex.current === index}
                onDragStart={handleDragStart}
                onDragEnter={handleDragEnter}
                onDragEnd={handleDragEnd}
              />
            ))
          )}
        </div>

        {/* Live Preview */}
        {showPreview && (
          <div className="card p-5 h-fit">
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4 text-primary-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Live Preview
              </span>
            </div>
            <LivePreview fields={fields} />
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100 dark:border-gray-800">
        {[
          { label: 'Total Fields', value: fields.length },
          { label: 'Required', value: fields.filter(f => f.validation?.required).length },
          { label: 'System', value: fields.filter(f => f.meta?.system).length },
          { label: 'Custom', value: fields.filter(f => !f.meta?.system).length },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}:</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{value}</span>
          </div>
        ))}
      </div>

      {/* Field editor modal */}
      {showModal && (
        <FieldEditorModal
          field={editingField}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingField(null) }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className={clsx(
          'fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all',
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
        )}>
          {toast.type === 'error'
            ? <AlertTriangle className="w-4 h-4" />
            : <CheckCircle className="w-4 h-4 text-green-400 dark:text-green-600" />
          }
          {toast.msg}
        </div>
      )}
    </div>
  )
}
