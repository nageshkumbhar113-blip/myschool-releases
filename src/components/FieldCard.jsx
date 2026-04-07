import React, { useRef } from 'react'
import {
  GripVertical, Edit2, Trash2, Lock,
  ToggleLeft, ToggleRight, Star,
} from 'lucide-react'
import { FIELD_TYPES } from '../utils/fieldTypes'
import clsx from 'clsx'

/**
 * FieldCard — one row in the field registry list.
 *
 * Props:
 *   field        — field definition object
 *   index        — position in the list (0-based)
 *   onEdit       — () => void
 *   onDelete     — () => void
 *   onToggleRequired — () => void
 *   isDragging   — bool (self)
 *   onDragStart  — (e, index) => void
 *   onDragEnter  — (e, index) => void
 *   onDragEnd    — (e) => void
 */
export default function FieldCard({
  field,
  index,
  onEdit,
  onDelete,
  onToggleRequired,
  isDragging,
  onDragStart,
  onDragEnter,
  onDragEnd,
}) {
  const def = FIELD_TYPES[field.type] ?? FIELD_TYPES.text
  const Icon = def.icon
  const isSystem = field.meta?.system

  const typeColors = {
    text:     'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    number:   'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    date:     'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    select:   'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    textarea: 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400',
    image:    'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400',
  }

  return (
    <div
      draggable={!isSystem}
      onDragStart={e => onDragStart(e, index)}
      onDragEnter={e => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
      className={clsx(
        'group flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 select-none',
        'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700',
        isDragging && 'opacity-40 scale-95 border-dashed border-primary-400',
        !isDragging && 'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm',
      )}
    >
      {/* Drag handle */}
      <div className={clsx(
        'shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600',
        isSystem && 'invisible',
      )}>
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Order badge */}
      <span className="w-6 h-6 shrink-0 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-mono font-semibold text-gray-500 dark:text-gray-400 flex items-center justify-center">
        {index + 1}
      </span>

      {/* Type icon */}
      <div className={clsx('w-8 h-8 shrink-0 rounded-lg flex items-center justify-center', typeColors[field.type] ?? typeColors.text)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Label + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {field.label}
          </span>
          {isSystem && (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded-md font-medium">
              <Star className="w-2.5 h-2.5" /> System
            </span>
          )}
          {field.validation?.required && (
            <span className="text-xs text-red-500 font-semibold">*</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{field.key}</span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{def.label}</span>
          {field.type === 'select' && field.options?.length > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{field.options.length} options</span>
            </>
          )}
          {(field.type === 'text' || field.type === 'textarea') && field.validation?.maxLength && (
            <>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">max {field.validation.maxLength}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Required toggle */}
        <button
          onClick={onToggleRequired}
          title={field.validation?.required ? 'Make optional' : 'Make required'}
          className={clsx(
            'p-1.5 rounded-lg transition-colors',
            field.validation?.required
              ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {field.validation?.required
            ? <ToggleRight className="w-4 h-4" />
            : <ToggleLeft className="w-4 h-4" />
          }
        </button>

        {/* Edit */}
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Edit field"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        {isSystem ? (
          <span title="System fields are protected" className="p-1.5 text-gray-200 dark:text-gray-700 cursor-not-allowed">
            <Lock className="w-3.5 h-3.5" />
          </span>
        ) : (
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete field"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
