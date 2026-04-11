import { isAdmissionOptionalFieldCandidate } from './studentFieldFilter'

export const ADMISSION_ALWAYS_INCLUDED_FIELDS = [
  'Full Name',
  'Date of Birth',
  'Gender',
  'Student ID',
  'UID (Adhar No)',
  'Mother Tongue',
  'Reg. No.',
  'Photo',
  'Roll Number',
  'Class',
  'Medium',
  'Board',
  'Academic Year',
  'Status',
  'Total Fee',
  'Discount',
]

export const ADMISSION_OPTIONAL_FIELDS = [
  { key: 'srNo',             label: 'SR No',                  type: 'text', validation: { required: false, maxLength: 50 },  sources: ['LC'] },
  { key: 'admissionNo',      label: 'Admission No',           type: 'text', validation: { required: false, maxLength: 60 },  sources: ['LC', 'Bonafide'] },
  { key: 'fatherName',       label: 'Father Name',            type: 'text', validation: { required: false, maxLength: 100 }, sources: ['LC', 'Bonafide'] },
  { key: 'motherName',       label: 'Mother Name',            type: 'text', validation: { required: false, maxLength: 100 }, sources: ['LC', 'Bonafide'] },
  { key: 'nationality',      label: 'Nationality',            type: 'text', validation: { required: false, maxLength: 80 },  sources: ['LC'] },
  { key: 'placeOfBirth',     label: 'Place of Birth',         type: 'text', validation: { required: false, maxLength: 120 }, sources: ['LC'] },
  { key: 'caste',            label: 'Caste',                  type: 'text', validation: { required: false, maxLength: 80 },  sources: ['LC'] },
  { key: 'religion',         label: 'Religion',               type: 'text', validation: { required: false, maxLength: 80 },  sources: ['LC'] },
  { key: 'dateOfAdmission',  label: 'Date of Admission',      type: 'date', validation: { required: false },                 sources: ['LC'] },
  { key: 'dobInWords',       label: 'Date of Birth in Words', type: 'text', validation: { required: false, maxLength: 150 }, sources: ['LC'] },
  { key: 'lastClassStudied', label: 'Last Class Studied',     type: 'text', validation: { required: false, maxLength: 80 },  sources: ['LC'] },
  { key: 'previousClass',    label: 'Previous Class',         type: 'text', validation: { required: false, maxLength: 80 },  sources: ['Admission'] },
  { key: 'previousMedium',   label: 'Previous Medium',        type: 'text', validation: { required: false, maxLength: 80 },  sources: ['Admission'] },
  { key: 'studyingSince',    label: 'Studying Since',         type: 'text', validation: { required: false, maxLength: 80 },  sources: ['Bonafide'] },
  { key: 'previousSchool',   label: 'Previous School',        type: 'text', validation: { required: false, maxLength: 150 }, sources: ['Admission'] },
  { key: 'mobileNumber',     label: 'Mobile Number',          type: 'text', validation: { required: false, maxLength: 20 },  sources: ['Admission'] },
]

const PREDEFINED_ADMISSION_KEYS = new Set(
  ADMISSION_OPTIONAL_FIELDS.map((field) => field.key)
)

export function getAdmissionSelectableFields(fields = []) {
  const customFields = fields
    .filter((field) => !field?.deletedAt)
    .filter(isAdmissionOptionalFieldCandidate)
    .filter((field) => !PREDEFINED_ADMISSION_KEYS.has(field.key))
    .map((field) => ({
      key: field.key,
      label: field.label,
      type: field.type,
      validation: { ...(field.validation ?? {}) },
      sources: ['Form Builder'],
      isCustom: true,
    }))

  return [...ADMISSION_OPTIONAL_FIELDS, ...customFields]
}

export function getSelectedAdmissionFieldKeys(fields = []) {
  return getAdmissionSelectableFields(fields)
    .filter((item) => {
      const existing = fields.find((field) => field.key === item.key && !field.deletedAt)
      if (!existing) return false
      return existing.meta?.showInAdmissionForm !== false
    })
    .map((item) => item.key)
}

export function countSelectedAdmissionFields(fields = []) {
  return getSelectedAdmissionFieldKeys(fields).length
}
