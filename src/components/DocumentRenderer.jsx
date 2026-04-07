/**
 * DocumentRenderer.jsx
 *
 * Single unified renderer for document templates.
 * Replaces the 3-way split of TemplateBuilder preview / LCPreview / lcPdfGenerator.
 *
 * Used for:
 *   - Builder preview (with mock data)
 *   - Student LC / Bonafide preview modal
 *   - Print / PDF output
 *
 * Props:
 *   template    {object}  — full template (with fieldMappings[])
 *   fields      {Array}   — field definitions for the institute (from db.fields)
 *   student     {object}  — student record (dynamicFields included); null → use placeholders
 *   settings    {object}  — school settings object; null → use placeholders
 *   manualData  {object}  — { [fieldKey]: value } for fieldSource === 'manual' fields
 *   mode        {string}  — 'preview' | 'print'
 *   pageSize    {string}  — 'A4' | 'A3'
 */

import React, { useEffect, useRef, useState } from 'react'
import useSettingsStore from '../store/useSettingsStore'
import { getCurrentInstituteId } from '../utils/dbHelpers'
import { getPageSizeConfig } from '../utils/pageSizes'
import { isEmptyDocumentValue, resolveDocumentFieldValue } from '../utils/documentValueResolver'

// ── Page dimensions at 96 dpi ─────────────────────────────────────────────────

// ── Value resolution ──────────────────────────────────────────────────────────

/**
 * Resolve the display value for one field mapping.
 *
 * Resolution order:
 *   static          → always use fieldDef.label as the literal text
 *   fieldSource === 'student'  → student.dynamicFields[fieldDef.key]
 *   fieldSource === 'settings' → settings[fieldDef.key]
 *   fieldSource === 'manual'   → manualData[fieldDef.key]
 *
 * Returns { value: string|null, isEmpty: boolean, isImage: boolean }
 */
function resolveFieldValue({ mapping, fieldDef, student, settings, manualData }) {
  if (!fieldDef) return { value: null, isEmpty: true, isImage: false }

  const isImage  = fieldDef.type === 'image'
  const isStatic = fieldDef.type === 'static'

  if (isStatic) {
    return { value: fieldDef.label, isEmpty: false, isImage: false }
  }

  const raw = resolveDocumentFieldValue({
    mapping,
    fieldDef,
    student,
    settings,
    manualData,
  })

  const isEmpty = isEmptyDocumentValue(raw)
  return {
    value:   isEmpty ? null : raw,
    isEmpty,
    isImage,
  }
}

// ── Single document element ───────────────────────────────────────────────────

function DocumentElement({ mapping, fieldDef, student, settings, manualData, mode }) {
  const { value, isEmpty, isImage } = resolveFieldValue({
    mapping, fieldDef, student, settings, manualData,
  })

  const isStatic    = fieldDef?.type === 'static'
  const isTextarea  = fieldDef?.type === 'textarea'
  const placeholderLabel = fieldDef?.label ?? mapping.fieldId

  // ── Base positioning style ────────────────────────────────────────────────
  const posStyle = {
    position:  'absolute',
    left:      `${mapping.x ?? 0}%`,
    top:       `${mapping.y ?? 0}%`,
    width:     `${mapping.width ?? 25}%`,
    height:    `${mapping.height ?? 5}%`,
    zIndex:    mapping.zIndex ?? 1,
    boxSizing: 'border-box',
    overflow:  'hidden',
  }

  // ── Text style ────────────────────────────────────────────────────────────
  const textStyle = {
    fontSize:   `${mapping.fontSize ?? 12}px`,
    fontWeight: mapping.fontWeight ?? 'normal',
    color:      mapping.color ?? '#000',
    lineHeight: '1.5',
  }

  // ── Image field ───────────────────────────────────────────────────────────
  if (isImage) {
    if (isEmpty) {
      if (mode === 'print') return null
      return (
        <div
          style={{
            ...posStyle,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            border:         '1.5px dashed #ef4444',
            borderRadius:   2,
          }}
        >
          <span style={{ fontSize: '10px', color: '#ef4444' }}>
            [{placeholderLabel}]
          </span>
        </div>
      )
    }

    return (
      <div style={posStyle}>
        <img
          src={value}
          alt={placeholderLabel}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
        />
      </div>
    )
  }

  // ── Missing non-static field in print mode → blank underline ─────────────
  if (!isStatic && isEmpty && mode === 'print') {
    return (
      <div
        style={{
          ...posStyle,
          ...textStyle,
          display:      'flex',
          alignItems:   'flex-end',
          padding:      '0 4px',
          borderBottom: '1px solid #000',
        }}
      />
    )
  }

  // ── Missing non-static field in preview mode → red placeholder ───────────
  if (!isStatic && isEmpty && mode === 'preview') {
    return (
      <div
        style={{
          ...posStyle,
          ...textStyle,
          display:    'flex',
          alignItems: 'center',
          padding:    '0 4px',
          color:      '#ef4444',
        }}
      >
        <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
          [{placeholderLabel}]
        </span>
      </div>
    )
  }

  // ── Normal text / static ──────────────────────────────────────────────────
  const displayValue = isStatic ? fieldDef.label : String(value)

  return (
    <div
      style={{
        ...posStyle,
        ...textStyle,
        display:    'flex',
        alignItems: isTextarea ? 'flex-start' : 'center',
        padding:    isTextarea ? '4px' : '0 4px',
      }}
    >
      <span
        style={{
          overflow:     isTextarea ? 'hidden' : 'hidden',
          whiteSpace:   isTextarea ? 'pre-wrap' : 'nowrap',
          textOverflow: isTextarea ? 'clip'     : 'ellipsis',
          width:        '100%',
          wordBreak:    isTextarea ? 'break-word' : 'normal',
        }}
      >
        {displayValue}
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DocumentRenderer({
  template  = null,
  fields    = [],
  student   = null,
  settings  = null,   // if null, fetched from useSettingsStore automatically
  manualData = {},
  mode      = 'preview',
  pageSize  = 'A4',
}) {
  const wrapperRef = useRef(null)
  const [scale, setScale] = useState(1)

  // ── Settings fallback: fetch from store when caller doesn't pass them ─────
  const { settings: storeSettings, loadSettings } = useSettingsStore()
  const effectiveSettings = settings ?? storeSettings

  useEffect(() => {
    if (settings != null) return          // caller provided — no fetch needed
    const id = getCurrentInstituteId()
    if (id) loadSettings(id)
  }, [])                                  // run once on mount

  const { widthPx: docWidth, heightPx: docHeight } = getPageSizeConfig(pageSize)
  const fieldMappings = template?.fieldMappings ?? []

  // ── Scale-to-fit using ResizeObserver ─────────────────────────────────────
  useEffect(() => {
    if (mode === 'print') return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const compute = () => {
      const w = wrapper.clientWidth
      if (w > 0) setScale(w / docWidth)
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(wrapper)
    return () => ro.disconnect()
  }, [docWidth, mode])

  // ── The document page ─────────────────────────────────────────────────────
  const page = (
    <div
      style={{
        width:           docWidth,
        height:          docHeight,
        position:        'relative',
        backgroundColor: '#ffffff',
        color:           '#000000',
        fontFamily:      'Georgia, "Times New Roman", serif',
        overflow:        'hidden',
        boxSizing:       'border-box',
        // Background template image (if set in builder)
        ...(template?.backgroundImage
          ? {
              backgroundImage:    `url(${template.backgroundImage})`,
              backgroundSize:     'cover',
              backgroundPosition: 'center',
              backgroundRepeat:   'no-repeat',
            }
          : {}),
        // Box shadow only in preview (not in print output)
        ...(mode === 'preview'
          ? { boxShadow: '0 4px 32px rgba(0,0,0,0.18)' }
          : {}),
      }}
    >
      {fieldMappings.map((mapping) => {
        const fieldDef = fields.find(f => f.id === mapping.fieldId) ?? null
        // Skip unmapped fields silently — field may have been deleted
        if (!fieldDef) return null

        return (
          <DocumentElement
            key={mapping.fieldId}
            mapping={mapping}
            fieldDef={fieldDef}
            student={student}
            settings={effectiveSettings}
            manualData={manualData}
            mode={mode}
          />
        )
      })}
    </div>
  )

  // ── Print mode: render raw page (browser handles @page sizing) ───────────
  if (mode === 'print') {
    return page
  }

  // ── Preview mode: scale to fit the container ──────────────────────────────
  // Wrapper height mirrors the scaled document height so layout flow is correct.
  return (
    <div
      ref={wrapperRef}
      style={{
        width:    '100%',
        height:   docHeight * scale,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position:        'absolute',
          top:             0,
          left:            0,
          transformOrigin: 'top left',
          transform:       `scale(${scale})`,
        }}
      >
        {page}
      </div>
    </div>
  )
}
