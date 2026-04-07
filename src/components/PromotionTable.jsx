/**
 * PromotionTable.jsx
 *
 * Student selection table for the promotion workflow.
 *
 * Props:
 *   students    — Student[]    rows to display
 *   selected    — Set<string>  IDs of checked students
 *   onToggle    — (id) => void toggle one row
 *   onToggleAll — () => void   select all / deselect all
 *   loading     — bool
 */

import React from 'react'
import { CheckCircle, User, Loader2 } from 'lucide-react'
import clsx from 'clsx'

const STATUS_COLORS = {
  active:      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  inactive:    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  transferred: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  graduated:   'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
}

export default function PromotionTable({ students = [], selected, onToggle, onToggleAll, loading }) {
  const allSelected  = students.length > 0 && students.every(s => selected.has(s.id))
  const someSelected = !allSelected && students.some(s => selected.has(s.id))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!students.length) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <User className="w-10 h-10 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-400">No students found for the selected filters.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            {/* Select-all checkbox */}
            <th className="px-3 py-2.5 w-10">
              <button
                type="button"
                onClick={onToggleAll}
                className={clsx(
                  'w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors',
                  allSelected
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : someSelected
                      ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-400'
                      : 'border-gray-300 dark:border-gray-600 hover:border-primary-400',
                )}
                title={allSelected ? 'Deselect all' : 'Select all'}
              >
                {allSelected && <span className="text-[10px] leading-none">✓</span>}
                {someSelected && !allSelected && <span className="text-[10px] leading-none text-primary-600">−</span>}
              </button>
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-left">
              Student Name
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-left whitespace-nowrap">
              Current Class
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-left whitespace-nowrap">
              Roll No.
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-left">
              Status
            </th>
            <th className="px-3 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 text-left">
              Medium
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
          {students.map((student) => {
            const isSelected = selected.has(student.id)
            const name       = student.dynamicFields?.studentName ?? '—'
            const initials   = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

            return (
              <tr
                key={student.id}
                onClick={() => onToggle(student.id)}
                className={clsx(
                  'cursor-pointer transition-colors',
                  isSelected
                    ? 'bg-primary-50 dark:bg-primary-900/10 hover:bg-primary-100 dark:hover:bg-primary-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40',
                )}
              >
                {/* Row checkbox */}
                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onToggle(student.id)}
                    className={clsx(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      isSelected
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : 'border-gray-300 dark:border-gray-600 hover:border-primary-400',
                    )}
                  >
                    {isSelected && <span className="text-[9px] leading-none">✓</span>}
                  </button>
                </td>

                {/* Name + avatar */}
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center shrink-0 text-xs font-bold text-primary-700 dark:text-primary-400 overflow-hidden">
                      {student.dynamicFields?.photo
                        ? <img src={student.dynamicFields.photo} alt={name} className="w-full h-full object-cover" />
                        : initials
                      }
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">
                      {name}
                    </span>
                  </div>
                </td>

                {/* Class */}
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {student.class ? `Class ${student.class}` : '—'}
                </td>

                {/* Roll number */}
                <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 font-mono text-xs">
                  {student.rollNumber || '—'}
                </td>

                {/* Status */}
                <td className="px-3 py-2.5">
                  <span className={clsx(
                    'inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize',
                    STATUS_COLORS[student.status] ?? STATUS_COLORS.inactive,
                  )}>
                    {student.status}
                  </span>
                </td>

                {/* Medium */}
                <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs">
                  {student.medium || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {/* Footer: selection count */}
      <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>
          {selected.size} of {students.length} student{students.length !== 1 ? 's' : ''} selected
        </span>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onToggleAll}
            className="text-primary-600 dark:text-primary-400 hover:underline"
          >
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
        )}
      </div>
    </div>
  )
}
