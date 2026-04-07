/**
 * reportQueries.js
 *
 * All data-fetch logic for the Reports page.
 */

import { getFeeStatus } from './feeCalculations'
import { getStudents, getFees, getReceipts } from './dbHelpers'

const PAGE_SIZE = 50

function paginate(arr, page = 1, size = PAGE_SIZE) {
  const start = (page - 1) * size
  return {
    rows: arr.slice(start, start + size),
    total: arr.length,
    page,
    pages: Math.max(1, Math.ceil(arr.length / size)),
  }
}

function fmtDate(d) {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('en-IN')
  } catch {
    return String(d)
  }
}

const fmtCur = (n) => Number(n ?? 0)

function inDateRange(dateStr, from, to) {
  if (!dateStr) return true
  const d = dateStr.slice(0, 10)
  if (from && d < from) return false
  if (to && d > to) return false
  return true
}

async function loadStudentsWithFees(instituteId) {
  const [students, fees] = await Promise.all([
    getStudents(instituteId),
    getFees(instituteId),
  ])
  const feeMap = {}
  fees.forEach((fee) => { feeMap[fee.studentId] = fee })
  return students.map((student) => ({
    ...student,
    fee: feeMap[student.id] ?? null,
    feeStatus: getFeeStatus(feeMap[student.id] ?? null),
  }))
}

export async function queryStudentReport(instituteId, filters = {}) {
  const {
    academicYear,
    class: cls,
    medium,
    board,
    status,
    search,
    dateFrom,
    dateTo,
    page = 1,
    pageSize = PAGE_SIZE,
  } = filters

  const all = await loadStudentsWithFees(instituteId)
  const q = search?.trim().toLowerCase() ?? ''

  const filtered = all.filter((student) => {
    if (academicYear && student.academicYear !== academicYear) return false
    if (cls && student.class !== cls) return false
    if (medium && student.medium !== medium) return false
    if (board && student.board !== board) return false
    if (status && student.status !== status) return false
    if (!inDateRange(student.createdAt, dateFrom, dateTo)) return false
    if (q) {
      const name = (student.dynamicFields?.studentName ?? '').toLowerCase()
      const roll = (student.rollNumber ?? '').toLowerCase()
      if (!name.includes(q) && !roll.includes(q)) return false
    }
    return true
  })

  filtered.sort((a, b) =>
    (a.dynamicFields?.studentName ?? '').localeCompare(b.dynamicFields?.studentName ?? ''),
  )

  const rows = filtered.map((student, index) => ({
    '#': index + 1,
    'Name': student.dynamicFields?.studentName ?? '',
    'Roll No': student.rollNumber ?? '',
    'Class': student.class ?? '',
    'Medium': student.medium ?? '',
    'Board': student.board ?? '',
    'Academic Year': student.academicYear ?? '',
    'Status': student.status ?? '',
    'Admission Date': fmtDate(student.createdAt),
    'Total Fee': fmtCur(student.fee?.totalFee),
    'Discount': fmtCur(student.fee?.discount),
    'Paid': fmtCur(student.fee?.paidAmount),
    'Remaining': fmtCur(student.fee?.remainingAmount),
    'Fee Status': student.feeStatus,
  }))

  return paginate(rows, page, pageSize)
}

export async function queryFeeCollectionReport(instituteId, filters = {}) {
  const {
    dateFrom,
    dateTo,
    class: cls,
    paymentMode,
    academicYear,
    search,
    page = 1,
    pageSize = PAGE_SIZE,
  } = filters

  const [receipts, students] = await Promise.all([
    getReceipts(instituteId),
    getStudents(instituteId),
  ])

  const studentMap = {}
  students.forEach((student) => { studentMap[student.id] = student })
  const q = search?.trim().toLowerCase() ?? ''

  const filtered = receipts.filter((receipt) => {
    if (!inDateRange(receipt.paymentDate ?? receipt.createdAt, dateFrom, dateTo)) return false
    if (paymentMode && receipt.paymentMode !== paymentMode) return false
    const student = studentMap[receipt.studentId]
    if (!student) return true
    if (cls && student.class !== cls) return false
    if (academicYear && student.academicYear !== academicYear) return false
    if (q) {
      const name = (student.dynamicFields?.studentName ?? '').toLowerCase()
      const rno = (receipt.receiptNumber ?? '').toLowerCase()
      if (!name.includes(q) && !rno.includes(q)) return false
    }
    return true
  })

  filtered.sort((a, b) => (b.paymentDate ?? b.createdAt ?? '').localeCompare(a.paymentDate ?? a.createdAt ?? ''))

  const rows = filtered.map((receipt, index) => {
    const student = studentMap[receipt.studentId]
    return {
      '#': index + 1,
      'Receipt No': receipt.receiptNumber ?? '',
      'Date': fmtDate(receipt.paymentDate ?? receipt.createdAt),
      'Student Name': student?.dynamicFields?.studentName ?? '',
      'Class': student?.class ?? '',
      'Amount (Rs)': fmtCur(receipt.amount),
      'Payment Mode': receipt.paymentMode ?? 'Cash',
      'Installment #': receipt.installmentNumber ?? '',
    }
  })

  return {
    ...paginate(rows, page, pageSize),
    summary: {
      totalCollected: filtered.reduce((sum, receipt) => sum + fmtCur(receipt.amount), 0),
      receiptCount: filtered.length,
    },
  }
}

export async function queryPendingFeesReport(instituteId, filters = {}) {
  const { class: cls, medium, board, academicYear, search, page = 1, pageSize = PAGE_SIZE } = filters
  const all = await loadStudentsWithFees(instituteId)
  const q = search?.trim().toLowerCase() ?? ''

  const filtered = all.filter((student) => {
    if ((student.fee?.remainingAmount ?? 0) <= 0) return false
    if (cls && student.class !== cls) return false
    if (medium && student.medium !== medium) return false
    if (board && student.board !== board) return false
    if (academicYear && student.academicYear !== academicYear) return false
    if (q) {
      const name = (student.dynamicFields?.studentName ?? '').toLowerCase()
      const roll = (student.rollNumber ?? '').toLowerCase()
      if (!name.includes(q) && !roll.includes(q)) return false
    }
    return true
  })

  filtered.sort((a, b) => (b.fee?.remainingAmount ?? 0) - (a.fee?.remainingAmount ?? 0))

  const rows = filtered.map((student, index) => ({
    '#': index + 1,
    'Name': student.dynamicFields?.studentName ?? '',
    'Roll No': student.rollNumber ?? '',
    'Class': student.class ?? '',
    'Academic Year': student.academicYear ?? '',
    'Total Fee (Rs)': fmtCur(student.fee?.effectiveFee),
    'Paid (Rs)': fmtCur(student.fee?.paidAmount),
    'Pending (Rs)': fmtCur(student.fee?.remainingAmount),
    'Status': student.feeStatus,
    'Installments': student.fee?.installments?.length ?? 0,
  }))

  return {
    ...paginate(rows, page, pageSize),
    summary: {
      totalPending: filtered.reduce((sum, student) => sum + fmtCur(student.fee?.remainingAmount), 0),
      studentCount: filtered.length,
    },
  }
}

export async function queryClassWiseReport(instituteId, filters = {}) {
  const { academicYear, medium, board } = filters
  const all = await loadStudentsWithFees(instituteId)

  const filtered = all.filter((student) => {
    if (academicYear && student.academicYear !== academicYear) return false
    if (medium && student.medium !== medium) return false
    if (board && student.board !== board) return false
    return true
  })

  const groups = {}
  filtered.forEach((student) => {
    const cls = student.class || 'Unknown'
    if (!groups[cls]) {
      groups[cls] = { students: 0, totalFee: 0, collected: 0, pending: 0, paid: 0, partial: 0, overdue: 0 }
    }
    const group = groups[cls]
    group.students += 1
    group.totalFee += fmtCur(student.fee?.effectiveFee)
    group.collected += fmtCur(student.fee?.paidAmount)
    group.pending += fmtCur(student.fee?.remainingAmount)
    if (student.feeStatus === 'paid') group.paid += 1
    if (student.feeStatus === 'partial') group.partial += 1
    if (student.feeStatus === 'overdue') group.overdue += 1
  })

  const rows = Object.keys(groups)
    .sort((a, b) => {
      const na = parseInt(a, 10)
      const nb = parseInt(b, 10)
      if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
      return a.localeCompare(b)
    })
    .map((cls, index) => {
      const group = groups[cls]
      return {
        '#': index + 1,
        'Class': cls,
        'Students': group.students,
        'Total Fee (Rs)': group.totalFee,
        'Collected (Rs)': group.collected,
        'Pending (Rs)': group.pending,
        'Collection %': group.totalFee > 0 ? Math.round((group.collected / group.totalFee) * 100) : 0,
        'Fully Paid': group.paid,
        'Partial': group.partial,
        'Overdue': group.overdue,
      }
    })

  return {
    rows,
    total: rows.length,
    page: 1,
    pages: 1,
    summary: {
      totalStudents: filtered.length,
      totalFee: filtered.reduce((sum, student) => sum + fmtCur(student.fee?.effectiveFee), 0),
      totalCollected: filtered.reduce((sum, student) => sum + fmtCur(student.fee?.paidAmount), 0),
      totalPending: filtered.reduce((sum, student) => sum + fmtCur(student.fee?.remainingAmount), 0),
    },
  }
}

export async function queryReceiptRegister(instituteId, filters = {}) {
  const { dateFrom, dateTo, class: cls, paymentMode, search, page = 1, pageSize = PAGE_SIZE } = filters

  const [receipts, students, fees] = await Promise.all([
    getReceipts(instituteId),
    getStudents(instituteId),
    getFees(instituteId),
  ])

  const studentMap = {}
  students.forEach((student) => { studentMap[student.id] = student })
  const feeMap = {}
  fees.forEach((fee) => { feeMap[fee.studentId] = fee })
  const q = search?.trim().toLowerCase() ?? ''

  const filtered = receipts.filter((receipt) => {
    if (!inDateRange(receipt.paymentDate ?? receipt.createdAt, dateFrom, dateTo)) return false
    if (paymentMode && receipt.paymentMode !== paymentMode) return false
    const student = studentMap[receipt.studentId]
    if (cls && student?.class !== cls) return false
    if (q) {
      const name = (student?.dynamicFields?.studentName ?? '').toLowerCase()
      const rno = (receipt.receiptNumber ?? '').toLowerCase()
      if (!name.includes(q) && !rno.includes(q)) return false
    }
    return true
  })

  filtered.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))

  const rows = filtered.map((receipt, index) => {
    const student = studentMap[receipt.studentId]
    const fee = feeMap[receipt.studentId]
    return {
      '#': index + 1,
      'Receipt No': receipt.receiptNumber ?? '',
      'Date': fmtDate(receipt.paymentDate ?? receipt.createdAt),
      'Student Name': student?.dynamicFields?.studentName ?? '',
      'Roll No': student?.rollNumber ?? '',
      'Class': student?.class ?? '',
      'Amount (Rs)': fmtCur(receipt.amount),
      'Mode': receipt.paymentMode ?? 'Cash',
      'Inst. #': receipt.installmentNumber ?? '',
      'Total Fee (Rs)': fmtCur(fee?.totalFee),
      'Bal. Due (Rs)': fmtCur(fee?.remainingAmount),
    }
  })

  return {
    ...paginate(rows, page, pageSize),
    summary: {
      totalAmount: filtered.reduce((sum, receipt) => sum + fmtCur(receipt.amount), 0),
      count: filtered.length,
    },
  }
}

export const REPORT_RUNNERS = {
  student: queryStudentReport,
  collection: queryFeeCollectionReport,
  pending: queryPendingFeesReport,
  classwise: queryClassWiseReport,
  register: queryReceiptRegister,
}

export async function runReport(type, instituteId, filters) {
  const runner = REPORT_RUNNERS[type]
  if (!runner) throw new Error(`Unknown report type: ${type}`)
  return runner(instituteId, filters)
}

export async function getFilterOptions(instituteId) {
  const students = await getStudents(instituteId)
  const classes = [...new Set(students.map((student) => student.class).filter(Boolean))].sort((a, b) => {
    const na = parseInt(a, 10)
    const nb = parseInt(b, 10)
    return (!Number.isNaN(na) && !Number.isNaN(nb)) ? na - nb : a.localeCompare(b)
  })
  const mediums = [...new Set(students.map((student) => student.medium).filter(Boolean))].sort()
  const boards = [...new Set(students.map((student) => student.board).filter(Boolean))].sort()
  const years = [...new Set(students.map((student) => student.academicYear).filter(Boolean))].sort().reverse()

  return { classes, mediums, boards, years }
}
