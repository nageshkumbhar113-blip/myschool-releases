import { formatReceiptParticularAmount, getFeeStructure } from './feeStructure'

const fmt = (n) => `\u20B9${Number(n ?? 0).toLocaleString('en-IN')}`

const fmtDate = (d) => {
  if (!d) return '-'
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return String(d)
  }
}

const cell = (text, opts = {}) => ({
  text: String(text ?? '-'),
  border: [false, false, false, false],
  fontSize: 9,
  color: '#374151',
  ...opts,
})

const borderBottom = (text, opts = {}) => ({
  ...cell(text, opts),
  border: [false, false, false, true],
  borderColor: ['', '', '', '#e5e7eb'],
})

export function buildReceiptDocDef({ institute, student, receipt, fee }) {
  const instituteName = institute?.name ?? 'School Name'
  const instituteAddress = institute?.address ?? ''
  const institutePhone = institute?.phone ?? ''

  const studentName = student?.dynamicFields?.studentName ?? student?.name ?? 'N/A'
  const studentClass = student?.class ?? '-'
  const rollNumber = student?.rollNumber ?? '-'

  const receiptNo = receipt?.receiptNumber ?? '-'
  const receiptDate = fmtDate(receipt?.paymentDate ?? receipt?.createdAt)
  const amount = Number(receipt?.amount ?? 0)
  const paymentMode = receipt?.paymentMode ?? 'Cash'
  const installmentNumber = receipt?.installmentNumber ?? '-'

  const allInstallments = fee?.installments ?? []
  const previousInstallments = allInstallments.filter((item) => item.receiptId !== receipt?.id)

  const totalFee = fee?.totalFee ?? 0
  const discount = fee?.discount ?? 0
  const totalPaid = fee?.paidAmount ?? 0
  const remaining = fee?.remainingAmount ?? 0
  const isPaid = remaining <= 0

  const particulars = getFeeStructure({ feeStructure: institute?.feeStructure ?? [] })
  const particularAmounts = student?.dynamicFields?.feeStructureAmounts ?? {}

  const content = []

  content.push({
    stack: [
      { text: instituteName, style: 'schoolName' },
      instituteAddress ? { text: instituteAddress, style: 'schoolSub' } : null,
      institutePhone ? { text: `Ph: ${institutePhone}`, style: 'schoolSub' } : null,
    ].filter(Boolean),
    alignment: 'center',
    margin: [0, 0, 0, 4],
  })

  content.push({
    canvas: [{
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 515,
      y2: 0,
      lineWidth: 1.5,
      lineColor: '#4f46e5',
    }],
    margin: [0, 0, 0, 5],
  })

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
    margin: [0, 0, 0, 6],
  })

  content.push({
    columns: [
      {
        stack: [
          { text: `Student Name: ${studentName}`, fontSize: 10, bold: true, color: '#111827' },
          { text: `Class: ${studentClass}   Roll No: ${rollNumber}`, fontSize: 8, color: '#374151', margin: [0, 1, 0, 0] },
        ],
      },
      {
        stack: [
          { text: `Payment Mode: ${paymentMode}`, fontSize: 8, color: '#374151' },
          { text: `Installment No: ${installmentNumber}`, fontSize: 8, color: '#374151', margin: [0, 1, 0, 0] },
        ],
        alignment: 'right',
      },
    ],
    margin: [0, 0, 0, 5],
  })

  content.push({
    table: {
      widths: ['*'],
      body: [[{
        text: [
          { text: 'Amount Paid:  ', fontSize: 9, color: '#6b7280' },
          { text: fmt(amount), fontSize: 13, bold: true, color: '#1e40af' },
        ],
        alignment: 'center',
        fillColor: '#eff6ff',
        margin: [8, 6, 8, 6],
        border: [true, true, true, true],
        borderColor: ['#bfdbfe', '#bfdbfe', '#bfdbfe', '#bfdbfe'],
      }]],
    },
    margin: [0, 0, 0, 6],
  })

  content.push({
    table: {
      headerRows: 1,
      widths: [34, '*', 74],
      body: [
        [
          { text: 'Sr.', style: 'th' },
          { text: 'Particulars', style: 'th' },
          { text: 'Amount', style: 'th', alignment: 'right' },
        ],
        ...particulars.map((item, index) => [
          { text: String(index + 1).padStart(2, '0'), style: 'td' },
          { text: item.label, style: 'td' },
          { text: formatReceiptParticularAmount(particularAmounts[item.key]), style: 'td', alignment: 'right' },
        ]),
        [
          { text: '', style: 'td' },
          { text: 'Total', style: 'td', bold: true },
          { text: fmt(totalFee), style: 'td', alignment: 'right', bold: true },
        ],
      ],
    },
    margin: [0, 0, 0, 6],
  })

  if (previousInstallments.length > 0) {
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
          ...previousInstallments.map((item) => [
            { text: item.receiptNumber ?? '-', style: 'td' },
            { text: fmtDate(item.date), style: 'td' },
            { text: item.paymentMode ?? 'Cash', style: 'td' },
            { text: fmt(item.amount), style: 'td', alignment: 'right' },
          ]),
        ],
      },
      margin: [0, 0, 0, 6],
    })
  }

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
          cell(isPaid ? 'FULLY PAID' : fmt(remaining), {
            alignment: 'right',
            color: isPaid ? '#16a34a' : '#dc2626',
            bold: true,
          }),
        ],
      ].filter(Boolean),
    },
    margin: [0, 0, 0, 8],
  })

  content.push({
    stack: [
      {
        columns: [
          { text: '______________________\nReceived by', style: 'sig', alignment: 'left' },
          { text: '______________________\nAuthorized Signatory', style: 'sig', alignment: 'right' },
        ],
      },
      {
        text: 'This is a computer-generated receipt. No physical signature required.',
        style: 'footer',
        margin: [0, 8, 0, 0],
      },
    ],
    unbreakable: true,
  })

  const logoBase64 = institute?.logo ?? null

  return {
    pageSize: 'A5',
    pageOrientation: 'portrait',
    pageMargins: [28, 28, 28, 28],
    background: logoBase64
      ? (_page, pageSize) => ({
          image: logoBase64,
          width: 200,
          height: 200,
          absolutePosition: {
            x: (pageSize.width - 200) / 2,
            y: (pageSize.height - 200) / 2,
          },
          opacity: 0.10,
        })
      : undefined,
    content,
    styles: {
      schoolName: { fontSize: 14, bold: true, color: '#1e1b4b' },
      schoolSub: { fontSize: 8, color: '#6b7280' },
      receiptTitle: { fontSize: 12, bold: true, color: '#4f46e5' },
      metaRight: { fontSize: 8, color: '#374151', alignment: 'right' },
      sectionLabel: { fontSize: 8, bold: true, color: '#6b7280', decoration: 'underline' },
      th: { fontSize: 8, bold: true, fillColor: '#f3f4f6', color: '#374151', margin: [3, 2, 3, 2] },
      td: { fontSize: 8, color: '#374151', margin: [3, 1, 3, 1] },
      sig: { fontSize: 8, color: '#9ca3af', lineHeight: 1.6 },
      footer: { fontSize: 7, color: '#d1d5db', alignment: 'center', italics: true },
    },
    defaultStyle: {
      fontSize: 9,
      font: 'Roboto',
      lineHeight: 1.2,
    },
  }
}
