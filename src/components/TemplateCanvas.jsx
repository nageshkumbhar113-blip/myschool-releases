import React, { useRef } from 'react'
import DraggableField from './DraggableField'

/**
 * TemplateCanvas — A4-proportioned canvas that hosts DraggableField elements.
 *
 * Coordinate system: all positions are % of canvas width/height.
 * touch-action: none is set on the root div so Pointer Events work on touch screens.
 */
export default function TemplateCanvas({
  template,
  fields,
  selectedFieldId,
  onSelectField,
  onUpdateMapping,
  previewMode,
}) {
  const canvasRef = useRef(null)
  const isLocked  = template?.isLocked ?? false

  if (!template) {
    return (
      <div className="w-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl"
           style={{ aspectRatio: '210 / 297' }}>
        <p className="text-gray-400 text-sm">No template selected</p>
      </div>
    )
  }

  return (
    <div
      ref={canvasRef}
      className="relative mx-auto shadow-2xl overflow-hidden select-none"
      style={{
        width: '100%',
        aspectRatio: '210 / 297',
        touchAction: 'none',

        // Background image or plain white
        background: template.backgroundImage
          ? `url(${template.backgroundImage}) center/cover no-repeat`
          : '#ffffff',
      }}
      onClick={() => onSelectField(null)}
    >
      {/* ── Grid overlay (only when no background & not in preview) ── */}
      {!previewMode && !template.backgroundImage && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: [
              'linear-gradient(to right, rgba(99,102,241,0.07) 1px, transparent 1px)',
              'linear-gradient(to bottom, rgba(99,102,241,0.07) 1px, transparent 1px)',
            ].join(','),
            backgroundSize: '10% 10%',
          }}
        />
      )}

      {/* ── Zone bands: Header / Body / Footer ─────────────────────── */}
      {!previewMode && (
        <>
          {/* HEADER zone — top 18% */}
          <div
            className="absolute pointer-events-none left-0 right-0"
            style={{
              top: 0,
              height: '18%',
              borderBottom: '1.5px dashed rgba(99,102,241,0.30)',
              background: 'rgba(99,102,241,0.04)',
            }}
          >
            <span style={{
              position: 'absolute', top: 3, left: 5,
              fontSize: 8, fontFamily: 'sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(99,102,241,0.45)',
              pointerEvents: 'none',
            }}>
              Header
            </span>
          </div>

          {/* FOOTER zone — bottom 12% */}
          <div
            className="absolute pointer-events-none left-0 right-0"
            style={{
              bottom: 0,
              height: '12%',
              borderTop: '1.5px dashed rgba(99,102,241,0.30)',
              background: 'rgba(99,102,241,0.04)',
            }}
          >
            <span style={{
              position: 'absolute', bottom: 3, left: 5,
              fontSize: 8, fontFamily: 'sans-serif', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(99,102,241,0.45)',
              pointerEvents: 'none',
            }}>
              Footer
            </span>
          </div>

          {/* BODY label */}
          <span style={{
            position: 'absolute', top: '19%', left: 5,
            fontSize: 8, fontFamily: 'sans-serif', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            color: 'rgba(99,102,241,0.35)',
            pointerEvents: 'none',
          }}>
            Body
          </span>

          {/* Center guides */}
          <div className="absolute pointer-events-none"
               style={{ left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(99,102,241,0.10)' }} />
          <div className="absolute pointer-events-none"
               style={{ top: '50%', left: 0, right: 0, height: 1, background: 'rgba(99,102,241,0.10)' }} />
        </>
      )}

      {/* ── Field mappings ─────────────────────────────────────────── */}
      {(template.fieldMappings ?? []).map(mapping => {
        const field = fields.find(f => f.id === mapping.fieldId)
        return (
          <DraggableField
            key={mapping.fieldId}
            mapping={mapping}
            field={field}
            canvasRef={canvasRef}
            isSelected={selectedFieldId === mapping.fieldId}
            isLocked={isLocked}
            previewMode={previewMode}
            onSelect={() => onSelectField(mapping.fieldId)}
            onChange={changes => onUpdateMapping(mapping.fieldId, changes)}
          />
        )
      })}

      {/* ── "Locked" badge ─────────────────────────────────────────── */}
      {isLocked && !previewMode && (
        <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full pointer-events-none">
          LOCKED
        </div>
      )}
    </div>
  )
}
