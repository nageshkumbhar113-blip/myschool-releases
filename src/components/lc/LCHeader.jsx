/**
 * LCHeader.jsx
 *
 * Dynamic header — settings मधून auto data येतो.
 * headerConfig मधून logo size, position, font sizes customize होतात.
 *
 * headerConfig shape (all optional):
 * {
 *   logoSize:       number   px (default 64)
 *   logoPosition:   'left' | 'center' | 'right'
 *   schoolNameSize: number   px (default 22)
 *   addressSize:    number   px (default 11)
 *   metaSize:       number   px (default 10)
 *   titleSize:      number   px (default 16)
 *   paddingTop:     number   mm (default 10)
 *   showLogo:       boolean  (default true)
 *   showAddress:    boolean  (default true)
 *   showMeta:       boolean  (default true)
 * }
 */

import React, { useId } from 'react'
import { DEFAULT_HEADER_CONFIG } from '../../utils/headerConfig'

export default function LCHeader({
  settings,
  title = 'SCHOOL LEAVING CERTIFICATE',
  headerConfig = {},
}) {
  const schoolNamePathId = useId()
  const cfg = { ...DEFAULT_HEADER_CONFIG, ...headerConfig }

  const {
    organizationName = '',
    schoolName = '',
    logo       = '',
    address    = '',
    udiseCode  = '',
    boardName  = '',
    phone      = '',
  } = settings ?? {}

  const meta = [
    boardName && `Board: ${boardName}`,
    udiseCode && `UDISE: ${udiseCode}`,
    phone     && `Ph: ${phone}`,
  ].filter(Boolean).join('  |  ')

  const logoJustify = {
    left:   'flex-start',
    center: 'center',
    right:  'flex-end',
  }[cfg.logoPosition] ?? 'center'

  const textBlockStyle = (align, offsetX, offsetY) => ({
    width:       '100%',
    textAlign:   align ?? 'center',
    transform:   `translate(${offsetX ?? 0}px, ${offsetY ?? 0}px)`,
    boxSizing:   'border-box',
  })

  const schoolNameValue = schoolName || 'School Name'
  const curveDepth = Number(cfg.schoolNameCurveDepth ?? 28)
  const curveHeight = Math.max(72, Math.abs(curveDepth) + (cfg.schoolNameSize ?? 22) * 2.4)
  const curveBaseline = curveDepth >= 0 ? curveHeight - 10 : 24
  const curveControlY = curveBaseline - curveDepth
  const schoolNameStartOffset = {
    left: '40%',
    center: '50%',
    right: '60%',
  }[cfg.schoolNameAlign] ?? '50%'

  return (
    <div style={{
      textAlign:    'center',
      padding:      `${cfg.paddingTop}mm 12mm 6mm`,
      borderBottom: '2px solid #222',
      marginBottom: '6mm',
    }}>

      {/* Logo */}
      {cfg.showLogo && logo && (
        <div
          style={{
            display:        'flex',
            justifyContent: logoJustify,
            marginBottom:   6,
            transform:      `translate(${cfg.logoOffsetX ?? 0}px, ${cfg.logoOffsetY ?? 0}px)`,
          }}
        >
          <img
            src={logo}
            alt="School Logo"
            style={{ height: cfg.logoSize, width: cfg.logoSize, objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Organization Name */}
      {organizationName && (
        <div
          style={{
            width:         '100%',
            textAlign:     'center',
            fontSize:      (cfg.schoolNameSize ?? 22) * 0.65,
            fontWeight:    600,
            color:         '#333',
            letterSpacing: 0.5,
            marginBottom:  2,
          }}
        >
          {organizationName}
        </div>
      )}

      {/* School Name */}
      {cfg.schoolNameCurved ? (
        <div
          style={{
            ...textBlockStyle(cfg.schoolNameAlign, cfg.schoolNameOffsetX, cfg.schoolNameOffsetY),
            marginBottom: 3,
          }}
        >
          <svg
            viewBox={`0 0 1000 ${curveHeight}`}
            style={{ width: '100%', height: curveHeight, display: 'block', overflow: 'visible' }}
            aria-label={schoolNameValue}
          >
            <defs>
              <path
                id={schoolNamePathId}
                d={`M 80 ${curveBaseline} Q 500 ${curveControlY} 920 ${curveBaseline}`}
                fill="none"
              />
            </defs>
            <text
              fill="#111"
              fontSize={cfg.schoolNameSize}
              fontWeight="800"
              letterSpacing="0.5"
            >
              <textPath href={`#${schoolNamePathId}`} startOffset={schoolNameStartOffset} textAnchor="middle">
                {schoolNameValue}
              </textPath>
            </text>
          </svg>
        </div>
      ) : (
        <div
          style={{
            ...textBlockStyle(cfg.schoolNameAlign, cfg.schoolNameOffsetX, cfg.schoolNameOffsetY),
            fontSize:      cfg.schoolNameSize,
            fontWeight:    800,
            color:         '#111',
            letterSpacing: 0.5,
            marginBottom:  3,
          }}
        >
          {schoolNameValue}
        </div>
      )}

      {/* Address */}
      {cfg.showAddress && address && (
        <div
          style={{
            ...textBlockStyle(cfg.addressAlign, cfg.addressOffsetX, cfg.addressOffsetY),
            fontSize:     cfg.addressSize,
            color:        '#444',
            marginBottom: 3,
            lineHeight:   1.5,
          }}
        >
          {address}
        </div>
      )}

      {/* Meta */}
      {cfg.showMeta && meta && (
        <div
          style={{
            ...textBlockStyle(cfg.metaAlign, cfg.metaOffsetX, cfg.metaOffsetY),
            fontSize:     cfg.metaSize,
            color:        '#666',
            marginBottom: 8,
          }}
        >
          {meta}
        </div>
      )}

      {/* Double rule */}
      <div style={{ borderTop: '2.5px solid #111', borderBottom: '1px solid #111', height: 4, margin: '0 0 10px' }} />

      {/* Title */}
      <div
        style={{
          ...textBlockStyle(cfg.titleAlign, cfg.titleOffsetX, cfg.titleOffsetY),
          fontSize:       cfg.titleSize,
          fontWeight:     700,
          letterSpacing:  3,
          textTransform:  'uppercase',
          color:          '#000',
        }}
      >
        {title}
      </div>
    </div>
  )
}
