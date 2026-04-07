/**
 * receiptTemplateData.js
 *
 * Adapts receipt-domain data ({ institute, student, receipt, fee }) into the
 * shape expected by DocumentRenderer-based templates.
 */

const safeNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

/**
 * Convert receipt data into a student-like document payload so receipt
 * templates can continue using fieldSource === 'student' mappings.
 */
export function buildReceiptTemplateStudent({ student, receipt, fee }) {
  const dynamicFields = student?.dynamicFields ?? {}

  return {
    ...student,
    class: student?.class ?? dynamicFields.class ?? '-',
    rollNumber: student?.rollNumber ?? dynamicFields.rollNumber ?? '-',
    dynamicFields: {
      ...dynamicFields,
      studentName: dynamicFields.studentName ?? student?.name ?? 'Student',
      class: student?.class ?? dynamicFields.class ?? '-',
      rollNumber: student?.rollNumber ?? dynamicFields.rollNumber ?? '-',
      receiptNo: receipt?.receiptNumber ?? dynamicFields.receiptNo ?? '-',
      receiptDate: receipt?.paymentDate ?? receipt?.createdAt ?? dynamicFields.receiptDate ?? '',
      amountPaid: safeNumber(receipt?.amount),
      paymentMode: receipt?.paymentMode ?? 'Cash',
      remainingBalance: safeNumber(fee?.remainingAmount),
      totalFee: safeNumber(fee?.totalFee),
      discount: safeNumber(fee?.discount),
      totalPaid: safeNumber(fee?.paidAmount),
      installmentNumber: receipt?.installmentNumber ?? '',
    },
  }
}

/**
 * Normalise institute/settings data so template settings keys resolve
 * consistently inside DocumentRenderer.
 */
export function buildReceiptTemplateSettings(source = {}) {
  return {
    ...source,
    schoolName: source.schoolName ?? source.name ?? 'School Name',
    address: source.address ?? '',
    phone: source.phone ?? '',
    logo: source.logo ?? '',
  }
}
