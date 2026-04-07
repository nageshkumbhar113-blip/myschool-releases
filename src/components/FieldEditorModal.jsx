import React, { useEffect, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { X, Plus, Trash2, Info } from 'lucide-react'
import { FIELD_TYPES, FIELD_TYPE_LIST } from '../utils/fieldTypes'
import clsx from 'clsx'

/**
 * FieldEditorModal
 *
 * Props:
 *   field      — existing field object (null when adding new)
 *   onSave     — (data) => void
 *   onClose    — () => void
 */
export default function FieldEditorModal({ field, onSave, onClose }) {
  const isEdit = !!field

  const defaultValues = isEdit
    ? {
        label: field.label,
        key: field.key,
        type: field.type,
        options: (field.options ?? []).map(o => ({ value: o })),
        required: field.validation?.required ?? false,
        maxLength: field.validation?.maxLength ?? '',
        min: field.validation?.min ?? '',
        max: field.validation?.max ?? '',
        minDate: field.validation?.minDate ?? '',
        maxDate: field.validation?.maxDate ?? '',
      }
    : {
        label: '',
        key: '',
        type: 'text',
        options: [{ value: '' }],
        required: false,
        maxLength: '',
        min: '',
        max: '',
        minDate: '',
        maxDate: '',
      }

  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({ defaultValues })
  const { fields: optionFields, append, remove } = useFieldArray({ control, name: 'options' })

  const watchedType = watch('type')
  const watchedLabel = watch('label')

  // Auto-generate key from label (only when adding)
  useEffect(() => {
    if (isEdit) return
    const key = watchedLabel
      .trim()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .split(' ')
      .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('')
    setValue('key', key)
  }, [watchedLabel, isEdit, setValue])

  const onSubmit = (data) => {
    const typeDef = FIELD_TYPES[data.type]

    const validation = { required: data.required }
    if (data.type === 'text' || data.type === 'textarea') {
      if (data.maxLength !== '') validation.maxLength = Number(data.maxLength)
    }
    if (data.type === 'number') {
      if (data.min !== '') validation.min = Number(data.min)
      if (data.max !== '') validation.max = Number(data.max)
    }
    if (data.type === 'date') {
      if (data.minDate) validation.minDate = data.minDate
      if (data.maxDate) validation.maxDate = data.maxDate
    }

    const options = data.type === 'select'
      ? data.options.map(o => o.value).filter(Boolean)
      : []

    onSave({ label: data.label, key: data.key, type: data.type, options, validation })
  }

  const typeDef = FIELD_TYPES[watchedType] ?? FIELD_TYPES.text
  const TypeIcon = typeDef.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Field' : 'Add New Field'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* Type selector */}
            <div>
              <label className="label">Field Type</label>
              <div className="grid grid-cols-3 gap-2">
                {FIELD_TYPE_LIST.map(({ key, label, icon: Icon }) => (
                  <label
                    key={key}
                    className={clsx(
                      'flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all',
                      watchedType === key
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    <input type="radio" value={key} {...register('type')} className="sr-only" />
                    <Icon className={clsx('w-5 h-5', watchedType === key ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400')} />
                    <span className={clsx('text-xs font-medium', watchedType === key ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400')}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Label */}
            <div>
              <label className="label">Label <span className="text-red-500">*</span></label>
              <input
                {...register('label', { required: 'Label is required' })}
                className="input"
                placeholder="e.g. Student Name"
              />
              {errors.label && <p className="text-xs text-red-500 mt-1">{errors.label.message}</p>}
            </div>

            {/* Key */}
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <label className="label mb-0">Field Key <span className="text-red-500">*</span></label>
                <Info className="w-3.5 h-3.5 text-gray-400" title="Unique identifier stored in the database" />
              </div>
              <input
                {...register('key', {
                  required: 'Key is required',
                  pattern: { value: /^[a-zA-Z][a-zA-Z0-9]*$/, message: 'camelCase, no spaces or symbols' },
                })}
                className="input font-mono text-sm"
                placeholder="studentName"
              />
              {errors.key && <p className="text-xs text-red-500 mt-1">{errors.key.message}</p>}
            </div>

            {/* Required toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Required field</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Enforce input before form submission</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" {...register('required')} className="sr-only peer" />
                <div className="w-10 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:ring-2 peer-focus:ring-primary-500 rounded-full peer peer-checked:bg-primary-600 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>

            {/* Validation — text / textarea */}
            {(watchedType === 'text' || watchedType === 'textarea') && (
              <div>
                <label className="label">Max Length</label>
                <input
                  {...register('maxLength')}
                  type="number"
                  min="1"
                  className="input"
                  placeholder="e.g. 255"
                />
              </div>
            )}

            {/* Validation — number */}
            {watchedType === 'number' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Min Value</label>
                  <input {...register('min')} type="number" className="input" placeholder="e.g. 0" />
                </div>
                <div>
                  <label className="label">Max Value</label>
                  <input {...register('max')} type="number" className="input" placeholder="e.g. 100" />
                </div>
              </div>
            )}

            {/* Validation — date */}
            {watchedType === 'date' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Min Date</label>
                  <input {...register('minDate')} type="date" className="input" />
                </div>
                <div>
                  <label className="label">Max Date</label>
                  <input {...register('maxDate')} type="date" className="input" />
                </div>
              </div>
            )}

            {/* Options — select */}
            {watchedType === 'select' && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Options <span className="text-red-500">*</span></label>
                  <button
                    type="button"
                    onClick={() => append({ value: '' })}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add option
                  </button>
                </div>
                <div className="space-y-2">
                  {optionFields.map((opt, idx) => (
                    <div key={opt.id} className="flex gap-2">
                      <input
                        {...register(`options.${idx}.value`, { required: true })}
                        className="input"
                        placeholder={`Option ${idx + 1}`}
                      />
                      {optionFields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-600 transition-colors shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Image info */}
            {watchedType === 'image' && (
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Images are stored as Base64 strings inside the student's dynamic fields record. Keep images small for best performance (recommended: &lt; 500 KB).
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 shrink-0">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">
              Cancel
            </button>
            <button type="submit" className="btn-primary flex-1 justify-center">
              {isEdit ? 'Save Changes' : 'Add Field'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
