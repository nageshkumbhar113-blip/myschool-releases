import React, { useEffect, useRef, useState } from 'react'
import LCHeader from './LCHeader'
import LCFooter from './LCFooter'
import { getPageSizeConfig } from '../../utils/pageSizes'
import { isEmptyDocumentValue, resolveDocumentFieldValue } from '../../utils/documentValueResolver'

const SETTINGS_KEYS = new Set(['schoolName', 'address', 'logo', 'udiseCode', 'boardName', 'phone', 'principalName', 'clerkName', 'signature', 'stamp', 'organizationName', 'organizationNameColor', 'schoolNameColor', 'registrationNo', 'sscIndexNo', 'schoolCode'])
const MANUAL_KEYS = new Set(['reasonForLeaving', 'remark', 'dateOfIssue', 'purpose'])

function getFieldSource(mapping, fieldDef) {
  if (mapping?.fieldSource) return mapping.fieldSource
  if (SETTINGS_KEYS.has(fieldDef?.key)) return 'settings'
  if (MANUAL_KEYS.has(fieldDef?.key)) return 'manual'
  return 'student'
}

function resolveValue({ mapping, fieldDef, student, settings, manualData }) {
  return resolveDocumentFieldValue({
    mapping: { ...mapping, fieldSource: getFieldSource(mapping, fieldDef) },
    fieldDef,
    student,
    settings,
    manualData,
  })
}

export default function LCDocumentLayout({
  template,
  fields = [],
  student = null,
  settings = {},
  manualData = {},
  title = 'SCHOOL LEAVING CERTIFICATE',
  mode = 'preview',
  showFrame = false,
}) {
  const wrapperRef = useRef(null)
  const [scale, setScale] = useState(1)
  const pageSize = template?.pageSize ?? 'A4'
  const {
    widthPx: pageWidthPx,
    heightPx: pageHeightPx,
    widthMm: pageWidthMm,
    heightMm: pageHeightMm,
  } = getPageSizeConfig(pageSize)
  const pageWidth = mode === 'print' ? pageWidthMm : pageWidthPx
  const pageHeight = mode === 'print' ? pageHeightMm : pageHeightPx
  const mappings = template?.fieldMappings ?? []
  const bodyMappings = mappings.filter((mapping) => {
    const fieldDef = fields.find((field) => field.id === mapping.fieldId)
    return fieldDef && !SETTINGS_KEYS.has(fieldDef.key) && fieldDef.type !== 'static'
  })

  const isLC = template?.type === 'lc'
  const todayFormatted = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const effectiveDateOfIssue = manualData?.dateOfIssue || todayFormatted

  useEffect(() => {
    if (mode === 'print') return

    const wrapper = wrapperRef.current
    if (!wrapper) return

    const compute = () => {
      const width = wrapper.clientWidth
      if (width > 0) setScale(width / pageWidthPx)
    }

    compute()
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(compute)
      ro.observe(wrapper)
      return () => ro.disconnect()
    }

    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [mode, pageWidthPx])

  const page = (
    <div
      style={{
        width: pageWidth,
        minHeight: pageHeight,
        height: pageHeight,
        background: '#fff',
        color: '#000',
        fontFamily: 'Georgia, "Times New Roman", serif',
        border: showFrame ? '1px solid #e5e7eb' : 'none',
        boxShadow: showFrame ? '0 4px 24px rgba(0,0,0,0.12)' : 'none',
        boxSizing: 'border-box',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {showFrame && (
        <>
          <div style={{ position: 'absolute', inset: 4, border: '2px solid #444', pointerEvents: 'none', zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 6, border: '0.5px solid #aaa', pointerEvents: 'none', zIndex: 0 }} />
        </>
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%' }}>
        <div style={{ flexShrink: 0 }}>
          <LCHeader settings={settings} title={title} headerConfig={template?.headerConfig ?? {}} />
        </div>

        <div style={{ padding: '3mm 12mm', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            {bodyMappings.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#aaa', fontSize: 12 }}>
                No body fields added
              </div>
            ) : (
              bodyMappings.map((mapping) => {
                const fieldDef = fields.find((field) => field.id === mapping.fieldId)
                if (!fieldDef) return null

                const rawValue = resolveValue({ mapping, fieldDef, student, settings, manualData })
                const value = isEmptyDocumentValue(rawValue)
                  ? ''
                  : String(rawValue)

                return (
                  <div
                    key={mapping.fieldId}
                    style={{
                      display: 'flex',
                      borderBottom: '1px dotted #ccc',
                      padding: '4px 0',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '45%',
                        fontSize: 12,
                        color: '#555',
                        paddingRight: 8,
                        flexShrink: 0,
                      }}
                    >
                      {fieldDef.label} :
                    </div>
                    <div
                      style={{
                        flex: 1,
                        fontSize: 12,
                        fontWeight: 600,
                        color: value ? '#000' : mode === 'preview' ? '#ef4444' : '#000',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {value || (mode === 'preview' ? `[${fieldDef.label}]` : '')}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* LC moral character note */}
          {isLC && (
            <div style={{ marginTop: '4mm', fontSize: 12, color: '#222', fontStyle: 'italic', flexShrink: 0 }}>
              To the best of my knowledge he/she bears a good moral character.
            </div>
          )}
        </div>

        <div style={{ marginTop: 'auto', flexShrink: 0 }}>
          <LCFooter settings={settings} dateOfIssue={effectiveDateOfIssue} />
        </div>
      </div>
    </div>
  )

  if (mode === 'print') {
    return page
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        width: '100%',
        height: pageHeightPx * scale,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: 'top left',
          transform: `scale(${scale})`,
        }}
      >
        {page}
      </div>
    </div>
  )
}
