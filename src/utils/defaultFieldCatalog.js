import { ADMISSION_OPTIONAL_FIELDS } from './admissionFieldCatalog'
import { PRESETS } from './presets'

const CORE_SYSTEM_FIELDS = [
  {
    label: 'Student Name',
    key: 'studentName',
    type: 'text',
    options: [],
    validation: { required: true, maxLength: 100 },
    meta: { system: true, seeded: true },
  },
  {
    label: 'Date of Birth',
    key: 'dateOfBirth',
    type: 'date',
    options: [],
    validation: { required: true },
    meta: { system: true, seeded: true },
  },
  {
    label: 'Gender',
    key: 'gender',
    type: 'select',
    options: ['Male', 'Female', 'Other'],
    validation: { required: true },
    meta: { system: true, seeded: true },
  },
  {
    label: 'Photo',
    key: 'photo',
    type: 'image',
    options: [],
    validation: { required: false },
    meta: { system: true, seeded: true },
  },
]

const ADD_STUDENT_READY_FIELDS = [
  {
    label: 'Student ID',
    key: 'studentId',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 60 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'UID (Adhar No)',
    key: 'uidAadharNo',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 20 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Mother Tongue',
    key: 'motherTongue',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 80 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Reg. No.',
    key: 'resistorNo',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 60 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Roll Number',
    key: 'rollNumber',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 40 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Class',
    key: 'class',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 40 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Medium',
    key: 'medium',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 40 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Board',
    key: 'board',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 40 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Academic Year',
    key: 'academicYear',
    type: 'text',
    options: [],
    validation: { required: false, maxLength: 20 },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Status',
    key: 'status',
    type: 'select',
    options: ['active', 'inactive'],
    validation: { required: false },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Total Fee',
    key: 'totalFee',
    type: 'number',
    options: [],
    validation: { required: false, min: 0, max: null },
    meta: { system: false, seeded: true },
  },
  {
    label: 'Discount',
    key: 'discount',
    type: 'number',
    options: [],
    validation: { required: false, min: 0, max: null },
    meta: { system: false, seeded: true },
  },
]

function createFieldSeedMap() {
  const seedMap = new Map()

  const addSeed = (field) => {
    if (!field?.key || seedMap.has(field.key)) return
    seedMap.set(field.key, field)
  }

  CORE_SYSTEM_FIELDS.forEach(addSeed)
  ADD_STUDENT_READY_FIELDS.forEach(addSeed)

  ;['lc', 'bonafide'].forEach((presetType) => {
    const presetFields = PRESETS[presetType]?.fields ?? []
    presetFields.forEach((field) => {
      if (!field?.key) return
      if (field.fieldSource === 'settings') return
      if (field.type === 'static') return

      addSeed({
        label: field.label,
        key: field.key,
        type: field.type,
        options: [],
        validation: field.required ? { required: true } : {},
        meta: { system: false, seeded: true },
      })
    })
  })

  ADMISSION_OPTIONAL_FIELDS.forEach((field) => {
    addSeed({
      label: field.label,
      key: field.key,
      type: field.type,
      options: [],
      validation: { ...(field.validation ?? {}) },
      meta: {
        system: false,
        seeded: true,
        admissionManaged: true,
        showInAdmissionForm: true,
      },
    })
  })

  return seedMap
}

const DEFAULT_FIELD_SEED_MAP = createFieldSeedMap()

export function buildDefaultFieldsForInstitute(instituteId) {
  const now = new Date().toISOString()

  return Array.from(DEFAULT_FIELD_SEED_MAP.values()).map((field, index) => ({
    id: crypto.randomUUID(),
    label: field.label,
    key: field.key,
    type: field.type,
    options: [...(field.options ?? [])],
    validation: { ...(field.validation ?? {}) },
    meta: {
      ...(field.meta ?? {}),
      order: index,
    },
    instituteId,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }))
}

export const DEFAULT_READYMADE_FIELD_COUNT = DEFAULT_FIELD_SEED_MAP.size
