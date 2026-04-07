import React, { useRef, useState, useEffect, useCallback } from 'react'

const SNAP  = 0.5     // percent grid
const THRESHOLD = 8   // px before drag starts

const snap  = v => Math.round(v / SNAP) * SNAP
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

/**
 * DraggableField — absolutely-positioned field label on the template canvas.
 *
 * Drag:   grab anywhere on the field → moves x/y
 * Resize: grab the SE-corner handle → changes width/height
 *
 * Both use Pointer Events API + setPointerCapture + requestAnimationFrame.
 * Positions are always stored/reported in percentages (0-100).
 */
export default function DraggableField({
  mapping,      // { fieldId, x, y, width, height, fontSize, fontWeight, color, zIndex }
  field,        // field definition { label, key, type, ... }
  canvasRef,    // ref to the parent canvas element
  isSelected,
  isLocked,
  previewMode,
  onSelect,
  onChange,     // ({ x, y, width, height }) => void
}) {
  // Local display state — follows mapping but leads during drag
  const [local, setLocal] = useState({
    x: mapping.x, y: mapping.y,
    width: mapping.width, height: mapping.height,
  })

  // Ref mirrors local so RAF/handlers can read latest without stale closures
  const pendingRef = useRef({ ...local })
  const dragRef    = useRef(null)   // active drag session
  const rafRef     = useRef(null)   // pending animation frame

  // Sync when mapping is updated externally (property panel, store reorder, etc.)
  useEffect(() => {
    // Skip if we're currently dragging — local state leads
    if (dragRef.current) return
    const pos = { x: mapping.x, y: mapping.y, width: mapping.width, height: mapping.height }
    setLocal(pos)
    pendingRef.current = pos
  }, [mapping.x, mapping.y, mapping.width, mapping.height])

  // ── Start drag / resize ────────────────────────────────────────────────
  const startInteraction = useCallback((e, mode) => {
    if (isLocked || previewMode) return
    e.preventDefault()
    e.stopPropagation()

    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()

    dragRef.current = {
      mode,
      moved: false,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startX: pendingRef.current.x,
      startY: pendingRef.current.y,
      startW: pendingRef.current.width,
      startH: pendingRef.current.height,
      cW: rect.width,
      cH: rect.height,
    }

    // Route all future pointer events to this element until pointerup
    e.currentTarget.setPointerCapture(e.pointerId)
    onSelect()
  }, [isLocked, previewMode, canvasRef, onSelect])

  // ── Move handler (shared by both elements via bubbling) ───────────────
  const handlePointerMove = useCallback((e) => {
    const d = dragRef.current
    if (!d) return

    const dx = e.clientX - d.startClientX
    const dy = e.clientY - d.startClientY

    // 8-pixel threshold before drag starts
    if (!d.moved) {
      if (Math.hypot(dx, dy) < THRESHOLD) return
      d.moved = true
    }

    // Cancel any pending frame and queue a new one
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const p   = pendingRef.current
      const dxP = (dx / d.cW) * 100
      const dyP = (dy / d.cH) * 100

      let next
      if (d.mode === 'move') {
        next = {
          ...p,
          x: snap(clamp(d.startX + dxP, 0, 100 - p.width)),
          y: snap(clamp(d.startY + dyP, 0, 100 - p.height)),
        }
      } else {
        // resize — adjust width/height from original start values
        next = {
          ...p,
          width:  snap(clamp(d.startW + dxP, 3,  100 - d.startX)),
          height: snap(clamp(d.startH + dyP, 2,  100 - d.startY)),
        }
      }

      pendingRef.current = next
      setLocal({ ...next })
    })
  }, [])

  // ── Pointer up ────────────────────────────────────────────────────────
  const handlePointerUp = useCallback(() => {
    const d = dragRef.current
    if (!d) return
    if (d.moved) onChange({ ...pendingRef.current })
    dragRef.current = null
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null }
  }, [onChange])

  const { x, y, width, height } = local
  const inEditMode = isSelected && !previewMode && !isLocked

  return (
    <div
      style={{
        position: 'absolute',
        left:   `${x}%`,
        top:    `${y}%`,
        width:  `${width}%`,
        height: `${height}%`,
        zIndex: mapping.zIndex ?? 1,
        touchAction: 'none',
        userSelect: 'none',
        cursor: previewMode ? 'default' : isLocked ? 'not-allowed' : 'grab',
        boxSizing: 'border-box',
      }}
      onPointerDown={e => startInteraction(e, 'move')}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={e => e.stopPropagation()}
    >
      {/* ── Field content ─────────────────────────────────────────── */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          padding: '0 4px',
          fontSize:   `${mapping.fontSize ?? 12}px`,
          fontWeight: mapping.fontWeight ?? 'normal',
          color: previewMode ? (mapping.color ?? '#000') : (mapping.color ?? '#000'),
          border: inEditMode
            ? '1.5px solid #6366f1'
            : previewMode
              ? 'none'
              : '1px dashed rgba(99,102,241,0.45)',
          background: inEditMode ? 'rgba(99,102,241,0.06)' : 'transparent',
          borderRadius: 2,
          pointerEvents: 'none', // let parent capture pointer events
        }}
      >
        <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', width: '100%' }}>
          {previewMode && field?.type !== 'static'
            ? `[${field?.label ?? mapping.fieldId}]`
            : (field?.label ?? mapping.fieldId)
          }
        </span>
      </div>

      {/* ── Selection corner dots ──────────────────────────────────── */}
      {inEditMode && [
        { top: -3, left:  -3 },
        { top: -3, right: -3 },
        { bottom: -3, left: -3 },
      ].map((pos, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 7, height: 7,
            background: '#6366f1',
            borderRadius: '50%',
            pointerEvents: 'none',
            ...pos,
          }}
        />
      ))}

      {/* ── SE resize handle ───────────────────────────────────────── */}
      {inEditMode && (
        <div
          title="Drag to resize"
          style={{
            position: 'absolute',
            right: -5, bottom: -5,
            width: 11, height: 11,
            background: '#6366f1',
            border: '2px solid #fff',
            borderRadius: 3,
            cursor: 'se-resize',
            touchAction: 'none',
            zIndex: 10,
          }}
          onPointerDown={e => {
            // Stop propagation so the parent div's onPointerDown (mode=move)
            // doesn't fire after this handler.
            e.stopPropagation()
            startInteraction(e, 'resize')
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />
      )}
    </div>
  )
}
