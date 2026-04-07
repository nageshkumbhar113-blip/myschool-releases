/**
 * mockData.js
 *
 * Reusable sample data for DocumentRenderer preview mode.
 * Used in TemplateBuilder so the preview panel shows realistic output
 * instead of blank placeholders.
 *
 * Covers all preset template types: lc, bonafide, admission, receipt.
 */

export const MOCK_STUDENT = {
  dynamicFields: {
    // ── Identity
    studentName:      'Ravi Kumar Sharma',
    fatherName:       'Raj Kumar Sharma',
    motherName:       'Sunita Sharma',
    dateOfBirth:      '2008-05-15',
    dobInWords:       'Fifteenth May Two Thousand Eight',
    gender:           'Male',
    nationality:      'Indian',
    religion:         'Hindu',
    caste:            'General',
    placeOfBirth:     'Mumbai, Maharashtra',

    // ── Admission
    admissionNo:      'ADM-2019-001',
    srNo:             'SR-2019-042',
    dateOfAdmission:  '2019-06-10',

    // ── Academic
    lastClassStudied: 'X (Secondary)',
    board:            'CBSE',
    result:           'Passed with Distinction',
    leavingDate:      '2024-03-31',
    studyingSince:    '2019',
    academicYear:     '2023-24',

    // ── Receipt / Fees
    receiptNo:        'RCPT-2024-001',
    receiptDate:      '2024-04-01',
    amountPaid:       12000,
    paymentMode:      'Cash',
    remainingBalance: 0,
  },

  // Top-level student fields
  class:        'X',
  rollNumber:   '15',
  academicYear: '2023-24',
  medium:       'English',
  board:        'CBSE',
  status:       'active',
}

export const MOCK_SETTINGS = {
  schoolName:    'Sunrise Public School',
  address:       '123, Education Lane, Knowledge City, Maharashtra – 400001',
  udiseCode:     'MH123456789',
  boardName:     'CBSE',
  phone:         '+91 98765 43210',
  principalName: 'Dr. Anil Verma',
  clerkName:     'Mrs. Priya Joshi',
  logo:          '',
  signature:     '',
  stamp:         '',
}

export const MOCK_MANUAL = {
  reasonForLeaving: 'Passed out from school after completing Class X',
  remark:           'Student has maintained good conduct throughout the academic year.',
  dateOfIssue:      new Date().toISOString().split('T')[0],
  purpose:          'For educational loan application at State Bank of India',
}
