/**
 * pdfGenerator.js
 *
 * Builds a pdfmake document definition for a fee receipt.
 * Pure function — no side effects, safe to call in a Web Worker.
 *
 * Usage (main thread or worker):
 *   import { buildReceiptDocDef } from './pdfGenerator'
 *   const docDef = buildReceiptDocDef({ institute, student, receipt, fee })
 *   pdfMake.createPdf(docDef).getBlob(blob => ...)
 */

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt = (n) => `\u20B9${Number(n ?? 0).toLocaleString('en-IN')}`

const fmtDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

const cell = (text, opts = {}) => ({
  text: String(text ?? '-'),
  border: [false, false, false, false],
  fontSize: 10,
  color: '#374151',
  ...opts,
})

const borderBottom = (text, opts = {}) => ({
  ...cell(text, opts),
  border: [false, false, false, true],
  borderColor: ['', '', '', '#e5e7eb'],
})

// ── Document Definition ───────────────────────────────────────────────────

/**
 * @param {object} params
 * @param {object} params.institute  — { name, address, phone, email, logo? }
 * @param {object} params.student    — { dynamicFields, class, rollNumber }
 * @param {object} params.receipt    — { receiptNumber, amount, paymentDate, paymentMode, installmentNumber }
 * @param {object} params.fee        — { totalFee, discount, effectiveFee, paidAmount, remainingAmount, installments[] }
 * @returns {object}  pdfmake TDocumentDefinitions
 */
export function buildReceiptDocDef({ institute, student, receipt, fee }) {
  const instituteName    = institute?.name    ?? 'School Name'
  const instituteAddress = institute?.address ?? ''
  const institutePhone   = institute?.phone   ?? ''

  const studentName  = student?.dynamicFields?.studentName ?? student?.name ?? 'N/A'
  const studentClass = student?.class ?? '-'
  const rollNumber   = student?.rollNumber ?? '-'

  const receiptNo    = receipt?.receiptNumber ?? '-'
  const receiptDate  = fmtDate(receipt?.paymentDate ?? receipt?.createdAt)
  const amount       = Number(receipt?.amount ?? 0)
  const paymentMode  = receipt?.paymentMode ?? 'Cash'
  const instNum      = receipt?.installmentNumber ?? '-'

  // Previous installments (exclude current receipt)
  const allInstallments = fee?.installments ?? []
  const prevInstallments = allInstallments.filter(i => i.receiptId !== receipt?.id)

  const totalFee     = fee?.totalFee         ?? 0
  const discount     = fee?.discount         ?? 0
  const totalPaid    = fee?.paidAmount       ?? 0
  const remaining    = fee?.remainingAmount  ?? 0

  const isPaid = remaining <= 0

  // ── Content ────────────────────────────────────────────────────────────

  const content = []

  // Header: School Name + Address
  content.push({
    stack: [
      { text: instituteName, style: 'schoolName' },
      instituteAddress ? { text: instituteAddress, style: 'schoolSub' } : null,
      institutePhone   ? { text: `Ph: ${institutePhone}`, style: 'schoolSub' } : null,
    ].filter(Boolean),
    alignment: 'center',
    margin: [0, 0, 0, 6],
  })

  // Divider
  content.push({
    canvas: [{
      type: 'line', x1: 0, y1: 0, x2: 515, y2: 0,
      lineWidth: 2, lineColor: '#4f46e5',
    }],
    margin: [0, 0, 0, 8],
  })

  // Title + Receipt Meta
  content.push({
    columns: [
      { text: 'FEE RECEIPT', style: 'receiptTitle', alignment: 'left' },
      {
        stack: [
          { text: `Receipt No: ${receiptNo}`, style: 'metaRight' },
          { text: `Date: ${receiptDate}`, style: 'metaRight' },
        ],
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 10],
  })

  // Student + Installment info row
  content.push({
    table: {
      widths: ['*', '*'],
      body: [[
        {
          stack: [
            cell(`Student Name: ${studentName}`, { fontSize: 11, bold: true, color: '#111827' }),
            cell(`Class: ${studentClass}   Roll No: ${rollNumber}`),
          ],
          border: [false, false, true, false],
          borderColor: ['', '', '#e5e7eb', ''],
          margin: [0, 0, 12, 0],
        },
        {
          stack: [
            cell(`Payment Mode: ${paymentMode}`),
            cell(`Installment No: ${instNum}`),
          ],
          border: [false, false, false, false],
          margin: [12, 0, 0, 0],
        },
      ]],
    },
    margin: [0, 0, 0, 10],
  })

  // Amount Box
  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: [
          { text: 'Amount Paid:  ', fontSize: 12, color: '#6b7280' },
          { text: fmt(amount), fontSize: 18, bold: true, color: '#1e40af' },
        ],
        alignment: 'center',
        fillColor: '#eff6ff',
        margin: [10, 10, 10, 10],
        border: [true, true, true, true],
        borderColor: ['#bfdbfe', '#bfdbfe', '#bfdbfe', '#bfdbfe'],
      }]],
    },
    margin: [0, 0, 0, 12],
  })

  // Previous Installments Table (if any)
  if (prevInstallments.length > 0) {
    content.push({ text: 'Previous Installments', style: 'sectionLabel', margin: [0, 0, 0, 4] })
    content.push({
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', 'auto', '*'],
        body: [
          [
            { text: 'Receipt No', style: 'th' },
            { text: 'Date', style: 'th' },
            { text: 'Mode', style: 'th' },
            { text: 'Amount', style: 'th', alignment: 'right' },
          ],
          ...prevInstallments.map(i => [
            { text: i.receiptNumber ?? '-', style: 'td' },
            { text: fmtDate(i.date), style: 'td' },
            { text: i.paymentMode ?? 'Cash', style: 'td' },
            { text: fmt(i.amount), style: 'td', alignment: 'right' },
          ]),
        ],
      },
      margin: [0, 0, 0, 10],
    })
  }

  // Fee Summary
  content.push({
    table: {
      widths: ['*', 'auto'],
      body: [
        [borderBottom('Fee Summary', { bold: true, colSpan: 2, fontSize: 9, color: '#6b7280' }), {}],
        [cell('Total Fee'), cell(fmt(totalFee), { alignment: 'right' })],
        discount > 0
          ? [cell('Discount'), cell(`- ${fmt(discount)}`, { alignment: 'right', color: '#16a34a' })]
          : null,
        [borderBottom('Total Paid', { bold: true }), borderBottom(fmt(totalPaid), { bold: true, alignment: 'right', color: '#1d4ed8' })],
        [
          cell('Balance Due', { color: isPaid ? '#16a34a' : '#dc2626', bold: true }),
          cell(isPaid ? 'FULLY PAID ✓' : fmt(remaining), { alignment: 'right', color: isPaid ? '#16a34a' : '#dc2626', bold: true }),
        ],
      ].filter(Boolean),
    },
    margin: [0, 0, 0, 20],
  })

  // Signature row
  content.push({
    columns: [
      { text: '______________________\nReceived by', style: 'sig', alignment: 'left' },
      { text: '______________________\nAuthorized Signatory', style: 'sig', alignment: 'right' },
    ],
  })

  // Footer note
  content.push({
    text: 'This is a computer-generated receipt. No physical signature required.',
    style: 'footer',
    margin: [0, 10, 0, 0],
  })

  // ── Document Definition ────────────────────────────────────────────────

  return {
    pageSize: 'A5',
    pageOrientation: 'portrait',
    pageMargins: [30, 35, 30, 35],
    content,
    styles: {
      schoolName:    { fontSize: 17, bold: true, color: '#1e1b4b' },
      schoolSub:     { fontSize: 9, color: '#6b7280' },
      receiptTitle:  { fontSize: 14, bold: true, color: '#4f46e5' },
      metaRight:     { fontSize: 9, color: '#374151', alignment: 'right' },
      sectionLabel:  { fontSize: 9, bold: true, color: '#6b7280', decoration: 'underline' },
      th: { fontSize: 9, bold: true, fillColor: '#f3f4f6', color: '#374151', margin: [4, 3, 4, 3] },
      td: { fontSize: 9, color: '#374151', margin: [4, 2, 4, 2] },
      sig:    { fontSize: 9, color: '#9ca3af', lineHeight: 1.8 },
      footer: { fontSize: 8, color: '#d1d5db', alignment: 'center', italics: true },
    },
    defaultStyle: {
      fontSize: 10,
      font: 'Roboto',
      lineHeight: 1.3,
    },
  }
}
