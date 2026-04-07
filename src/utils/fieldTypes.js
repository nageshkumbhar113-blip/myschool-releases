import {
  Type,
  Hash,
  Calendar,
  List,
  AlignLeft,
  Image,
  Tag,
} from 'lucide-react'

/**
 * Master registry of every supported field type.
 * Each entry defines:
 *   key          — stored in field.type
 *   label        — human-readable name
 *   icon         — Lucide component
 *   defaultValue — sensible empty value for the preview
 *   defaults     — initial validation / options when a new field is created
 *   validationKeys — which validation keys are relevant for the editor UI
 */
export const FIELD_TYPES = {
  text: {
    key: 'text',
    label: 'Text',
    icon: Type,
    defaultValue: '',
    defaults: {
      validation: { required: false, maxLength: 255 },
      options: [],
    },
    validationKeys: ['required', 'maxLength'],
  },

  number: {
    key: 'number',
    label: 'Number',
    icon: Hash,
    defaultValue: '',
    defaults: {
      validation: { required: false, min: null, max: null },
      options: [],
    },
    validationKeys: ['required', 'min', 'max'],
  },

  date: {
    key: 'date',
    label: 'Date',
    icon: Calendar,
    defaultValue: '',
    defaults: {
      validation: { required: false, minDate: null, maxDate: null },
      options: [],
    },
    validationKeys: ['required', 'minDate', 'maxDate'],
  },

  select: {
    key: 'select',
    label: 'Dropdown',
    icon: List,
    defaultValue: '',
    defaults: {
      validation: { required: false },
      options: ['Option 1', 'Option 2'],
    },
    validationKeys: ['required'],
  },

  textarea: {
    key: 'textarea',
    label: 'Textarea',
    icon: AlignLeft,
    defaultValue: '',
    defaults: {
      validation: { required: false, maxLength: 1000 },
      options: [],
    },
    validationKeys: ['required', 'maxLength'],
  },

  image: {
    key: 'image',
    label: 'Image / Photo',
    icon: Image,
    defaultValue: null,
    defaults: {
      validation: { required: false },
      options: [],
      // base64 data stored directly in the student dynamicFields map
    },
    validationKeys: ['required'],
  },

  static: {
    key: 'static',
    label: 'Static Label',
    icon: Tag,
    defaultValue: '',
    defaults: {
      validation: {},
      options: [],
    },
    validationKeys: [],
  },
}

/** Ordered list for the "Add Field" palette */
export const FIELD_TYPE_LIST = Object.values(FIELD_TYPES)

// ─────────────────────────────────────────────────────────────────────────────
// Document Field Source Types
// Used in template fieldMappings to declare WHERE a rendered field's value
// comes from.  This is separate from the FormBuilder field types above.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Three source categories for every element in a document template's
 * fieldMappings array.
 *
 *  'student'  → value resolved from student.dynamicFields[fieldKey]
 *  'settings' → value resolved from the school settings store (schoolName,
 *               principalName, logo, stamp, address, …)
 *  'manual'   → value entered by the operator at generation time
 *               (reasonForLeaving, dateOfIssue, remark, purpose, …)
 */
export const LC_FIELD_SOURCES = {
  student: {
    key: 'student',
    label: 'Student Field',
    description: 'Value comes from student record (dynamicFields)',
  },
  settings: {
    key: 'settings',
    label: 'Settings Field',
    description: 'Value comes from school settings (name, logo, principal, …)',
  },
  manual: {
    key: 'manual',
    label: 'Manual Input',
    description: 'Operator enters this value at document generation time',
  },
}

/**
 * Input widget types used when fieldSource === 'manual'.
 * Determines which HTML control is rendered in ManualFieldsModal.
 */
export const LC_INPUT_TYPES = {
  text:     { key: 'text',     label: 'Single-line Text' },
  date:     { key: 'date',     label: 'Date Picker' },
  textarea: { key: 'textarea', label: 'Multi-line Text' },
}

/**
 * Migrate a single fieldMapping object to include the Phase 1 source fields.
 * Idempotent — returns the mapping unchanged if already migrated.
 *
 * Defaults:
 *   fieldSource : 'student'   (safe default for all pre-existing mappings)
 *   inputType   : 'text'      (only meaningful when fieldSource === 'manual')
 *   required    : false
 *
 * @param {object} mapping  — one entry from template.fieldMappings
 * @returns {object}
 */
export function migrateFieldMapping(mapping) {
  if (mapping.fieldSource !== undefined) return mapping   // already has the new schema
  return {
    ...mapping,
    fieldSource: 'student',
    inputType: 'text',
    required: false,
  }
}

/**
 * Migrate an entire fieldMappings array.
 * Safe to call on already-migrated arrays (no-op per element).
 *
 * @param {Array} mappings
 * @returns {Array}
 */
export function migrateFieldMappings(mappings) {
  if (!Array.isArray(mappings)) return []
  return mappings.map(migrateFieldMapping)
}

/**
 * Generate the default field structure for a given type + label.
 *
 * @param {string} type      — one of the FIELD_TYPES keys
 * @param {string} label     — user-facing label
 * @param {string} instituteId
 * @param {number} order     — display order index
 * @returns {object}
 */
export function createFieldDef(type, label, instituteId, order = 0) {
  const def = FIELD_TYPES[type]
  if (!def) throw new Error(`Unknown field type: ${type}`)

  // Derive a camelCase key from the label
  const key = label
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('')

  return {
    id: crypto.randomUUID(),
    label,
    key,
    type,
    options: [...(def.defaults.options ?? [])],
    validation: { ...def.defaults.validation },
    meta: { system: false, order },
    instituteId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Run client-side validation of a value against a field definition.
 * Returns an error string or null.
 *
 * @param {object} field
 * @param {*} value
 * @returns {string|null}
 */
export function validateFieldValue(field, value) {
  const v = field.validation ?? {}

  if (v.required && (value === '' || value === null || value === undefined)) {
    return `${field.label} is required`
  }
  if (!value && value !== 0) return null

  if (field.type === 'text' || field.type === 'textarea') {
    if (v.maxLength && String(value).length > v.maxLength)
      return `${field.label} must be at most ${v.maxLength} characters`
  }
  if (field.type === 'number') {
    const n = Number(value)
    if (v.min !== null && v.min !== undefined && n < Number(v.min))
      return `${field.label} must be ≥ ${v.min}`
    if (v.max !== null && v.max !== undefined && n > Number(v.max))
      return `${field.label} must be ≤ ${v.max}`
  }
  if (field.type === 'date') {
    if (v.minDate && value < v.minDate)
      return `${field.label} must be on or after ${v.minDate}`
    if (v.maxDate && value > v.maxDate)
      return `${field.label} must be on or before ${v.maxDate}`
  }
  return null
}
