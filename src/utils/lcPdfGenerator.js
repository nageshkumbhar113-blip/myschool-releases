/**
 * lcPdfGenerator.js
 *
 * Pure function that builds a pdfmake document definition for a
 * School Leaving Certificate (A4 portrait).
 *
 * Usage:
 *   import { buildLCDocDef } from './lcPdfGenerator'
 *   const docDef = buildLCDocDef({ settings, student, template, fields })
 *   pdfMake.createPdf(docDef).getBlob()
 *
 * Note: pdfmake 0.3.x does NOT support absolute positioning.
 * The PDF uses a structured (flow) layout — it looks professional but
 * does not pixel-perfectly mirror the template's x/y positions.
 * The on-screen/print preview (LCPreview.jsx) uses absolute positioning.
 */

import { DEFAULT_HEADER_CONFIG } from './headerConfig'

// ── Helpers ────────────────────────────────────────────────────────────────

function safeStr(v) {
  if (v === undefined || v === null || v === '') return '—'
  if (typeof v === 'string' && v.startsWith('data:')) return '[Image]'
  return String(v)
}

function hr(color = '#000', width = 1) {
  return {
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: width, lineColor: color }],
  }
}

// ── Build document definition ──────────────────────────────────────────────

export function buildLCDocDef({ settings = {}, student = {}, template = null, fields = [] }) {
  const cfg = { ...DEFAULT_HEADER_CONFIG, ...(template?.headerConfig ?? {}) }
  const {
    schoolName    = 'School Name',
    address       = '',
    udiseCode     = '',
    boardName     = '',
    phone         = '',
    principalName = '',
    clerkName     = '',
    logo          = '',
    signature     = '',
    stamp         = '',
  } = settings

  const df = student?.dynamicFields ?? {}

  // ── Build student data rows ──────────────────────────────────────────

  let dataRows = []

  const mappings = template?.fieldMappings ?? []
  if (mappings.length > 0) {
    // Use template field order (sort by y position top→bottom)
    const sorted = [...mappings].sort((a, b) => (a.y ?? 0) - (b.y ?? 0))
    for (const mapping of sorted) {
      const fieldDef = fields.find(f => f.id === mapping.fieldId)
      if (!fieldDef) continue
      const raw = df[fieldDef.key]
      if (typeof raw === 'string' && raw.startsWith('data:')) continue // skip images
      dataRows.push({ label: fieldDef.label, value: safeStr(raw) })
    }
  }

  // Fallback: basic student fields if no template or no rows
  if (!dataRows.length) {
    dataRows = [
      { label: 'Student Name',   value: safeStr(df.studentName ?? student.name) },
      { label: "Father's Name",  value: safeStr(df.fatherName) },
      { label: "Mother's Name",  value: safeStr(df.motherName) },
      { label: 'Date of Birth',  value: safeStr(df.dateOfBirth) },
      { label: 'Gender',         value: safeStr(df.gender) },
      { label: 'Class',          value: safeStr(student.class) },
      { label: 'Roll Number',    value: safeStr(student.rollNumber) },
      { label: 'Academic Year',  value: safeStr(student.academicYear) },
      { label: 'Medium',         value: safeStr(student.medium) },
      { label: 'Board',          value: safeStr(student.board) },
      { label: 'Status',         value: safeStr(student.status) },
    ].filter(r => r.value !== '—')
  }

  // ── Content ──────────────────────────────────────────────────────────

  const content = []

  // Logo
  if (cfg.showLogo && logo) {
    content.push({
      image: logo,
      width: cfg.logoSize,
      alignment: cfg.logoPosition,
      margin: [0, 0, 0, 6],
    })
  }

  // School name
  content.push({
    text:      schoolName,
    style:     'schoolName',
    alignment: cfg.schoolNameAlign,
    margin:    [0, 0, 0, 4],
  })

  // Address
  if (cfg.showAddress && address) {
    content.push({
      text:      address,
      style:     'small',
      alignment: cfg.addressAlign,
      margin:    [0, 0, 0, 3],
    })
  }

  // Meta line
  const meta = [
    boardName && `Board: ${boardName}`,
    udiseCode && `UDISE: ${udiseCode}`,
    phone     && `Ph: ${phone}`,
  ].filter(Boolean).join('  |  ')

  if (cfg.showMeta && meta) {
    content.push({ text: meta, style: 'tiny', alignment: cfg.metaAlign, margin: [0, 0, 0, 8] })
  }

  // Double rule
  content.push({
    canvas: [
      { type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#000' },
      { type: 'line', x1: 0, y1: 3, x2: 515, y2: 3, lineWidth: 0.5, lineColor: '#000' },
    ],
    margin: [0, 0, 0, 12],
  })

  // LC Title
  content.push({
    text:       'SCHOOL LEAVING CERTIFICATE',
    style:      'title',
    alignment:  cfg.titleAlign,
    margin:     [0, 0, 0, 20],
    decoration: 'underline',
  })

  // Student data
  content.push({
    table: {
      widths:      [180, '*'],
      body: dataRows.map(({ label, value }) => [
        { text: label + ' :', style: 'fieldLabel', border: [false, false, false, true], borderColor: [null, null, null, '#eee'] },
        { text: value,        style: 'fieldValue', border: [false, false, false, true], borderColor: [null, null, null, '#eee'] },
      ]),
    },
    layout: {
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0 : 0.5,
      hLineColor: () => '#ddd',
      vLineWidth: () => 0,
      paddingLeft:  () => 4,
      paddingRight: () => 4,
      paddingTop:   () => 5,
      paddingBottom:() => 5,
    },
    margin: [10, 0, 10, 24],
  })

  // Note box
  content.push({
    text: 'This certificate is issued on the request of the student/parent.',
    style: 'note',
    alignment: 'center',
    margin: [0, 0, 0, 30],
  })

  // ── Signature footer ──────────────────────────────────────────────────

  const sigImgCol = (name, role) => ({
    stack: [
      signature
        ? { image: signature, width: 60, margin: [0, 0, 0, 4] }
        : { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 120, y2: 0, lineWidth: 0.8, lineColor: '#000' }], margin: [0, 24, 0, 4] },
      { text: name || role, bold: true, fontSize: 10 },
      { text: role, fontSize: 9, color: '#555' },
    ],
  })

  const stampCol = stamp
    ? { image: stamp, width: 70, alignment: 'center' }
    : {
        canvas: [{
          type: 'ellipse', x: 35, y: 35, r1: 35, r2: 35,
          lineWidth: 1, lineColor: '#aaa',
        }],
        width: 70,
      }

  content.push({
    columns: [
      { ...sigImgCol(clerkName, 'Clerk / Office Staff'), alignment: 'left' },
      { stack: [stampCol, { text: 'School Stamp', fontSize: 8, color: '#aaa', alignment: 'center', margin: [0, 4, 0, 0] }], alignment: 'center', width: 'auto' },
      { ...sigImgCol(principalName, 'Principal / Head Master'), alignment: 'right' },
    ],
    columnGap: 20,
  })

  // ── Document definition ────────────────────────────────────────────────

  return {
    pageSize:        'A4',
    pageOrientation: 'portrait',
    pageMargins:     [40, 40, 40, 40],

    content,

    styles: {
      schoolName: { fontSize: cfg.schoolNameSize, bold: true, color: '#000' },
      small:      { fontSize: cfg.addressSize, color: '#444' },
      tiny:       { fontSize: cfg.metaSize,  color: '#666' },
      title:      { fontSize: cfg.titleSize, bold: true, color: '#000', characterSpacing: 2 },
      fieldLabel: { fontSize: 11, color: '#555', margin: [0, 2, 0, 2] },
      fieldValue: { fontSize: 11, bold: true, color: '#000', margin: [0, 2, 0, 2] },
      note:       { fontSize: 9,  italics: true, color: '#888' },
    },

    defaultStyle: {
      font: 'Roboto',
    },
  }
}
