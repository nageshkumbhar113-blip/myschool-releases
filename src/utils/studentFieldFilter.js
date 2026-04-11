const MANUAL_KEYS = new Set([
  'reasonForLeaving',
  'remark',
  'dateOfIssue',
  'purpose',
])

const SETTINGS_KEYS = new Set([
  'schoolName',
  'address',
  'logo',
  'udiseCode',
  'boardName',
  'phone',
  'principalName',
  'clerkName',
  'signature',
  'stamp',
])

const BUILTIN_STUDENT_KEYS = new Set([
  'studentName',
  'dateOfBirth',
  'gender',
  'photo',
])

const RESERVED_FORM_KEYS = new Set([
  'rollNumber',
  'class',
  'medium',
  'board',
  'academicYear',
  'status',
  'totalFee',
  'discount',
  'effectiveFee',
  'paidAmount',
  'remainingAmount',
  'studentId',
  'uidAadharNo',
  'motherTongue',
  'resistorNo',
  'receiptNo',
  'receiptDate',
  'amountPaid',
  'remainingBalance',
  'studyingSince',
  'paymentMode',
  'leavingDate',
  'studentPhoto',
  'result',
])

export function isStudentProfileField(field) {
  if (!field) return false
  if (field.type === 'static') return false
  if (MANUAL_KEYS.has(field.key)) return false
  if (SETTINGS_KEYS.has(field.key)) return false
  if (RESERVED_FORM_KEYS.has(field.key)) return false
  return true
}

export function isCustomStudentProfileField(field) {
  if (!isStudentProfileField(field)) return false
  if (field.meta?.showInAdmissionForm === false) return false
  return !BUILTIN_STUDENT_KEYS.has(field.key)
}

export function isAdmissionOptionalFieldCandidate(field) {
  if (!isStudentProfileField(field)) return false
  return !BUILTIN_STUDENT_KEYS.has(field.key)
}

export function isStudentDynamicFieldKey(key) {
  if (!key) return false
  if (MANUAL_KEYS.has(key)) return false
  if (SETTINGS_KEYS.has(key)) return false
  return true
}
