/**
 * LCBody.jsx
 *
 * Dynamic body of the Leaving Certificate.
 * Renders each template field at its x/y % position inside the body container.
 *
 * Props:
 *   fieldMappings  — array from template.fieldMappings
 *   fields         — array of field definitions (from db.fields)
 *   student        — student object (with dynamicFields, class, rollNumber, etc.)
 */

import React from 'react'

export default function LCBody({ fieldMappings = [], fields = [], student }) {
  const df = student?.dynamicFields ?? {}

  if (!fieldMappings.length) {
    // Fallback: show basic student info in a simple table
    const basics = [
      { label: 'Student Name',  value: df.studentName ?? student?.name ?? '' },
      { label: 'Father\'s Name', value: df.fatherName ?? '' },
      { label: 'Mother\'s Name', value: df.motherName ?? '' },
      { label: 'Date of Birth', value: df.dateOfBirth ?? '' },
      { label: 'Class',         value: student?.class ?? '' },
      { label: 'Roll Number',   value: student?.rollNumber ?? '' },
      { label: 'Academic Year', value: student?.academicYear ?? '' },
      { label: 'Medium',        value: student?.medium ?? '' },
      { label: 'Board',         value: student?.board ?? '' },
      { label: 'Gender',        value: df.gender ?? '' },
    ].filter(r => r.value)

    return (
      <div style={{ padding: '8mm 12mm', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {basics.map(({ label, value }) => (
              <tr key={label} style={{ borderBottom: '1px dotted #ccc' }}>
                <td style={{
                  padding: '5px 8px',
                  width: '45%',
                  fontSize: '12px',
                  color: '#555',
                  verticalAlign: 'top',
                }}>
                  {label}
                </td>
                <td style={{
                  padding: '5px 8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#000',
                  verticalAlign: 'top',
                }}>
                  {value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div
      style={{
        position: 'relative',
        flex:     1,
        minHeight: '320px',
      }}
    >
      {fieldMappings.map((mapping) => {
        const fieldDef = fields.find(f => f.id === mapping.fieldId)
        if (!fieldDef) return null

        const rawValue = df[fieldDef.key]
        // Skip image fields in the body text rendering
        if (typeof rawValue === 'string' && rawValue.startsWith('data:')) return null

        const value = rawValue !== undefined && rawValue !== null && rawValue !== ''
          ? String(rawValue)
          : '—'

        return (
          <div
            key={mapping.fieldId}
            style={{
              position:   'absolute',
              left:       `${mapping.x ?? 0}%`,
              top:        `${mapping.y ?? 0}%`,
              width:      `${mapping.width ?? 35}%`,
              fontSize:   `${mapping.fontSize ?? 12}px`,
              fontWeight: mapping.fontWeight ?? 'normal',
              color:      mapping.color ?? '#000',
              lineHeight: '1.5',
              zIndex:     mapping.zIndex ?? 0,
            }}
          >
            <span style={{ color: '#555', fontSize: '10px', display: 'block' }}>
              {fieldDef.label}
            </span>
            <span style={{ fontWeight: '600' }}>
              {value}
            </span>
          </div>
        )
      })}
    </div>
  )
}
