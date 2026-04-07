/**
 * LCFooter.jsx
 * Settings मधून auto — clerkName, principalName, signature, stamp
 */

import React from 'react'

export default function LCFooter({ settings, dateOfIssue = '' }) {
  const {
    clerkName     = '',
    principalName = '',
    signature     = '',
    stamp         = '',
  } = settings ?? {}

  const sigImg = (src, alt) => src
    ? <img src={src} alt={alt} style={{ height: 48, maxWidth: 120, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
    : <div style={{ borderBottom: '1px solid #000', width: 130, margin: '0 auto 4px', height: 30 }} />

  const stampEl = stamp
    ? <img src={stamp} alt="Stamp" style={{ height: 70, width: 70, objectFit: 'contain' }} />
    : <div style={{ width: 70, height: 70, border: '2px dashed #bbb', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#aaa', margin: '0 auto' }}>STAMP</div>

  return (
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'flex-end',
      padding:        '6mm 12mm 10mm',
      borderTop:      '1px solid #ccc',
      marginTop:      '8mm',
    }}>
      <div style={{ textAlign: 'center' }}>
        {sigImg(signature, 'Clerk Signature')}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{clerkName || 'Clerk Name'}</div>
        <div style={{ fontSize: 10, color: '#555' }}>Clerk / Office Staff</div>
      </div>

      <div style={{ textAlign: 'center' }}>
        {stampEl}
        {dateOfIssue && (
          <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>Date: {dateOfIssue}</div>
        )}
      </div>

      <div style={{ textAlign: 'center' }}>
        {sigImg(signature, 'Principal Signature')}
        <div style={{ fontSize: 11, fontWeight: 700, color: '#111' }}>{principalName || 'Principal Name'}</div>
        <div style={{ fontSize: 10, color: '#555' }}>Principal / Head Master</div>
      </div>
    </div>
  )
}