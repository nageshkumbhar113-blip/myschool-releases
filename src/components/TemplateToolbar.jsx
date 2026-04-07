import React, { useRef } from 'react'
import {
  Save, Eye, EyeOff, Lock, Unlock,
  Image, Trash2, Plus, AlertTriangle,
} from 'lucide-react'
import clsx from 'clsx'

const TEMPLATE_TYPES = [
  { value: 'admission', label: 'Admission' },
  { value: 'receipt',   label: 'Receipt'   },
  { value: 'lc',        label: 'LC'        },
  { value: 'bonafide',  label: 'Bonafide'  },
]

/**
 * TemplateToolbar — top bar for the template builder.
 *
 * Props:
 *   template         — current active template object
 *   previewMode      — bool
 *   isDirty          — bool (unsaved changes)
 *   onNameChange     — (name) => void
 *   onTypeChange     — (type) => void
 *   onBgUpload       — (base64) => void
 *   onBgClear        — () => void
 *   onPreviewToggle  — () => void
 *   onLockToggle     — () => void
 *   onSave           — () => void
 *   onDelete         — () => void
 */
export default function TemplateToolbar({
  template,
  previewMode,
  isDirty,
  onNameChange,
  onTypeChange,
  onBgUpload,
  onBgClear,
  onPreviewToggle,
  onLockToggle,
  onSave,
  onDelete,
}) {
  const fileRef = useRef(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 6 * 1024 * 1024) {
      alert('Image too large — max 6 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => onBgUpload(ev.target.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  if (!template) return null

  return (
    <div className="card p-3 flex flex-wrap items-center gap-2">
      {/* Template name */}
      <input
        value={template.name}
        onChange={e => onNameChange(e.target.value)}
        className="input text-sm font-semibold w-44"
        placeholder="Template name…"
      />

      {/* Type selector */}
      <select
        value={template.type}
        onChange={e => onTypeChange(e.target.value)}
        className="input text-sm w-32"
      >
        {TEMPLATE_TYPES.map(t => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" />

      {/* Background controls */}
      <button onClick={() => fileRef.current?.click()} className="btn-secondary text-xs">
        <Image className="w-3.5 h-3.5" />
        {template.backgroundImage ? 'Change BG' : 'Upload BG'}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {template.backgroundImage && (
        <button
          onClick={onBgClear}
          className="btn-secondary text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear BG
        </button>
      )}

      <div className="flex-1" />

      {/* Unsaved indicator */}
      {isDirty && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" /> Unsaved
        </span>
      )}

      {/* Preview toggle */}
      <button
        onClick={onPreviewToggle}
        className={clsx(
          'text-xs',
          previewMode ? 'btn-primary' : 'btn-secondary'
        )}
      >
        {previewMode
          ? <><EyeOff className="w-3.5 h-3.5" /> Exit Preview</>
          : <><Eye     className="w-3.5 h-3.5" /> Preview</>
        }
      </button>

      {/* Lock toggle */}
      <button
        onClick={onLockToggle}
        title={template.isLocked ? 'Unlock template' : 'Lock template'}
        className={clsx(
          'btn-secondary text-xs',
          template.isLocked && 'text-red-600 dark:text-red-400'
        )}
      >
        {template.isLocked
          ? <><Lock   className="w-3.5 h-3.5" /> Locked</>
          : <><Unlock className="w-3.5 h-3.5" /> Lock</>
        }
      </button>

      {/* Delete */}
      <button
        onClick={() => {
          if (confirm(`Delete template "${template.name}"? This cannot be undone.`)) onDelete()
        }}
        className="btn-secondary text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Save */}
      <button
        onClick={onSave}
        disabled={!isDirty}
        className="btn-primary text-xs disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Save className="w-3.5 h-3.5" />
        {isDirty ? 'Save' : 'Saved'}
      </button>
    </div>
  )
}
