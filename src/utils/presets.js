/**
 * Preset template definitions.
 *
 * Each preset defines:
 *   name       — default template name
 *   type       — stored in template.type
 *   fields     — ordered list of field specs to pre-place on the canvas
 *
 * Field spec:
 *   key        — camelCase identifier (used to look up existing DB fields)
 *   label      — human-readable label shown on canvas & in forms
 *   fieldType  — one of the FIELD_TYPES keys (text, number, date, image, static)
 *   x, y       — top-left position in % of A4 canvas
 *   w, h       — width/height in % of A4 canvas
 *   fontSize   — pixels
 *   fontWeight — 'normal' | '600' | 'bold'
 *
 * Coordinate system: A4 portrait → 210 mm wide × 297 mm tall.
 * 0% = top/left edge, 100% = bottom/right edge.
 */

export const PRESETS = {
  lc: {
    name: 'School Leaving Certificate',
    type: 'lc',
    fields: [
      // fieldSource: 'settings' — value comes from school settings store
      { key: 'schoolName',         label: 'School Name',                type: 'text',   x: 5,  y: 2,  w: 90, h: 6,  fontSize: 20, fontWeight: 'bold',   fieldSource: 'settings', inputType: 'text',     required: true  },
      { key: 'address',            label: 'School Address',             type: 'text',   x: 5,  y: 9,  w: 90, h: 4,  fontSize: 11, fontWeight: 'normal', fieldSource: 'settings', inputType: 'text',     required: false },
      // fieldSource: 'static' — literal label, no data needed (type:'static' handles it)
      { key: 'lcTitle',            label: 'SCHOOL LEAVING CERTIFICATE', type: 'static', x: 5,  y: 14, w: 90, h: 5,  fontSize: 16, fontWeight: 'bold',   fieldSource: 'student',  inputType: 'text',     required: false },
      // fieldSource: 'student' — value comes from student.dynamicFields
      { key: 'srNo',               label: 'SR No',                      type: 'text',   x: 68, y: 2,  w: 28, h: 4,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'admissionNo',        label: 'Admission No',               type: 'text',   x: 68, y: 7,  w: 28, h: 4,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'studentId',          label: 'Student ID',                 type: 'text',   x: 5,  y: 18, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'uidAadharNo',        label: 'UID (Adhar No)',             type: 'text',   x: 5,  y: 20, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'studentName',        label: 'Student Name',               type: 'text',   x: 5,  y: 22, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: true  },
      { key: 'fatherName',         label: 'Father Name',                type: 'text',   x: 5,  y: 27, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'motherName',         label: 'Mother Name',                type: 'text',   x: 5,  y: 32, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'motherTongue',       label: 'Mother Tongue',              type: 'text',   x: 5,  y: 34, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'nationality',        label: 'Nationality',                type: 'text',   x: 5,  y: 37, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'placeOfBirth',       label: 'Place of Birth',             type: 'text',   x: 5,  y: 42, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'resistorNo',         label: 'Reg. No.',                   type: 'text',   x: 5,  y: 44, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'caste',              label: 'Caste',                      type: 'text',   x: 5,  y: 47, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'religion',           label: 'Religion',                   type: 'text',   x: 51, y: 47, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'dateOfAdmission',    label: 'Date of Admission',          type: 'date',   x: 5,  y: 52, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'date',     required: false },
      { key: 'dateOfBirth',        label: 'Date of Birth',              type: 'date',   x: 5,  y: 57, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'date',     required: true  },
      { key: 'dobInWords',         label: 'Date of Birth in Words',     type: 'text',   x: 5,  y: 62, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'lastClassStudied',   label: 'Last Class Studied',         type: 'text',   x: 5,  y: 67, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'board',              label: 'Board',                      type: 'text',   x: 51, y: 67, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'result',             label: 'Result',                     type: 'text',   x: 5,  y: 72, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'leavingDate',        label: 'Leaving Date',               type: 'date',   x: 51, y: 72, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'date',     required: false },
      // fieldSource: 'manual' — operator enters at generation time
      { key: 'reasonForLeaving',   label: 'Reason for Leaving',         type: 'text',   x: 5,  y: 77, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'manual',   inputType: 'textarea', required: false },
      { key: 'clerkSignatureLabel',label: 'Clerk Signature',            type: 'static', x: 5,  y: 91, w: 30, h: 6,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'dateOfIssue',        label: 'Date of Issue',              type: 'date',   x: 37, y: 91, w: 26, h: 6,  fontSize: 11, fontWeight: 'normal', fieldSource: 'manual',   inputType: 'date',     required: true  },
      { key: 'principalSignLabel', label: 'Principal Signature',        type: 'static', x: 65, y: 91, w: 30, h: 6,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
    ],
  },

  admission: {
    name: 'Admission Form',
    type: 'admission',
    fields: [
      { key: 'schoolName',     label: 'School Name',     type: 'text',     x: 5,  y: 2,  w: 65, h: 6,  fontSize: 20, fontWeight: 'bold',   fieldSource: 'settings', inputType: 'text',     required: true  },
      { key: 'studentPhoto',   label: 'Student Photo',   type: 'image',    x: 73, y: 2,  w: 20, h: 14, fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'academicYear',   label: 'Academic Year',   type: 'text',     x: 5,  y: 11, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'admissionNo',    label: 'Admission No',    type: 'text',     x: 51, y: 11, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'studentName',    label: 'Student Name',    type: 'text',     x: 5,  y: 18, w: 65, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: true  },
      { key: 'studentId',      label: 'Student ID',      type: 'text',     x: 5,  y: 22, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'uidAadharNo',    label: 'UID (Adhar No)',  type: 'text',     x: 51, y: 22, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'motherTongue',   label: 'Mother Tongue',   type: 'text',     x: 5,  y: 28, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'resistorNo',     label: 'Reg. No.',        type: 'text',     x: 51, y: 28, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'fatherName',     label: 'Father Name',     type: 'text',     x: 5,  y: 34, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'motherName',     label: 'Mother Name',     type: 'text',     x: 5,  y: 40, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'dateOfBirth',    label: 'Date of Birth',   type: 'date',     x: 5,  y: 46, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'date',     required: true  },
      { key: 'class',          label: 'Class',           type: 'text',     x: 51, y: 46, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'medium',         label: 'Medium',          type: 'text',     x: 5,  y: 52, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'address',        label: 'Address',         type: 'textarea', x: 5,  y: 58, w: 90, h: 8,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'textarea', required: false },
      { key: 'mobileNumber',   label: 'Mobile Number',   type: 'text',     x: 5,  y: 68, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'previousSchool', label: 'Previous School', type: 'text',     x: 51, y: 68, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'parentSignLabel',label: 'Parent Signature',type: 'static',   x: 5,  y: 91, w: 35, h: 6,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
    ],
  },

  receipt: {
    name: 'Fee Receipt',
    type: 'receipt',
    fields: [
      { key: 'schoolName',         label: 'School Name',          type: 'text',   x: 5,  y: 2,  w: 65, h: 6,  fontSize: 20, fontWeight: 'bold',   fieldSource: 'settings', inputType: 'text',  required: true  },
      { key: 'receiptNo',          label: 'Receipt No',           type: 'text',   x: 72, y: 2,  w: 23, h: 4,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',  required: false },
      { key: 'receiptDate',        label: 'Date',                 type: 'date',   x: 72, y: 7,  w: 23, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'date',  required: false },
      { key: 'studentName',        label: 'Student Name',         type: 'text',   x: 5,  y: 16, w: 55, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',  required: true  },
      { key: 'class',              label: 'Class',                type: 'text',   x: 62, y: 16, w: 33, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',  required: false },
      { key: 'amountPaid',         label: 'Amount Paid',          type: 'number', x: 5,  y: 23, w: 55, h: 5,  fontSize: 14, fontWeight: 'bold',   fieldSource: 'student',  inputType: 'text',  required: false },
      { key: 'paymentMode',        label: 'Payment Mode',         type: 'text',   x: 5,  y: 30, w: 55, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',  required: false },
      { key: 'remainingBalance',   label: 'Remaining Balance',    type: 'number', x: 5,  y: 36, w: 55, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',  required: false },
      { key: 'authorizedSignLabel',label: 'Authorized Signature', type: 'static', x: 60, y: 91, w: 35, h: 6,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',  required: false },
    ],
  },

  bonafide: {
    name: 'Bonafide Certificate',
    type: 'bonafide',
    fields: [
      { key: 'schoolName',       label: 'School Name',           type: 'text',     x: 5,  y: 2,  w: 90, h: 6,  fontSize: 20, fontWeight: 'bold',   fieldSource: 'settings', inputType: 'text',     required: true  },
      { key: 'bonafideTitle',    label: 'BONAFIDE CERTIFICATE',  type: 'static',   x: 5,  y: 12, w: 90, h: 5,  fontSize: 16, fontWeight: 'bold',   fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'studentName',      label: 'Student Name',          type: 'text',     x: 5,  y: 22, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: true  },
      { key: 'studentId',        label: 'Student ID',            type: 'text',     x: 5,  y: 24, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'uidAadharNo',      label: 'UID (Adhar No)',        type: 'text',     x: 5,  y: 26, w: 90, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'class',            label: 'Class',                 type: 'text',     x: 5,  y: 28, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'academicYear',     label: 'Academic Year',         type: 'text',     x: 51, y: 28, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'motherTongue',     label: 'Mother Tongue',         type: 'text',     x: 5,  y: 31, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'resistorNo',       label: 'Reg. No.',              type: 'text',     x: 51, y: 31, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'dateOfBirth',      label: 'Date of Birth',         type: 'date',     x: 5,  y: 34, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'date',     required: true  },
      { key: 'studyingSince',    label: 'Studying Since',        type: 'text',     x: 51, y: 34, w: 44, h: 4,  fontSize: 12, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
      { key: 'purpose',          label: 'Purpose',               type: 'textarea', x: 5,  y: 40, w: 90, h: 8,  fontSize: 12, fontWeight: 'normal', fieldSource: 'manual',   inputType: 'textarea', required: false },
      { key: 'dateOfIssue',      label: 'Date of Issue',         type: 'date',     x: 60, y: 86, w: 35, h: 5,  fontSize: 11, fontWeight: 'normal', fieldSource: 'manual',   inputType: 'date',     required: true  },
      { key: 'principalSignLabel', label: 'Principal Signature', type: 'static',   x: 60, y: 91, w: 35, h: 6,  fontSize: 11, fontWeight: 'normal', fieldSource: 'student',  inputType: 'text',     required: false },
    ],
  },
}

export const PRESET_LIST = [
  { type: 'lc',        label: 'Leaving Certificate',  description: 'School leaving certificate with all standard fields' },
  { type: 'admission', label: 'Admission Form',        description: 'Student admission form with photo and details' },
  { type: 'bonafide',  label: 'Bonafide Certificate',  description: 'Bonafide certificate for students' },
  { type: 'custom',    label: 'Custom (Blank)',         description: 'Start from scratch with an empty canvas' },
]

export const LC_BONAFIDE_PRINT_KEYS = new Set([
  'studentId',
  'uidAadharNo',
  'motherTongue',
  'resistorNo',
])
