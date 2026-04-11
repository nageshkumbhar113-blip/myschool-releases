import { LC_BONAFIDE_PRINT_KEYS, PRESETS } from './presets'

function buildSyntheticFieldId(templateType, key) {
  return `__auto__${templateType ?? 'document'}__${key}`
}

function createSyntheticField({ template, spec, order }) {
  const now = new Date().toISOString()
  return {
    id: buildSyntheticFieldId(template?.type, spec.key),
    instituteId: template?.instituteId ?? '',
    label: spec.label,
    key: spec.key,
    type: spec.type,
    options: [],
    validation: {},
    meta: { system: false, synthetic: true, order },
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

function resolveMappedFieldKey(mapping, fieldById, templateType, allowedKeys) {
  const mappedField = fieldById.get(mapping.fieldId)
  if (mappedField?.key) return mappedField.key

  if (typeof mapping.fieldId !== 'string') return null
  const prefix = `__auto__${templateType ?? 'document'}__`
  if (!mapping.fieldId.startsWith(prefix)) return null

  const key = mapping.fieldId.slice(prefix.length)
  return allowedKeys.has(key) ? key : null
}

export function ensureLcBonafidePrintFields(template, fields = [], options = {}) {
  const { includeMissingMappings = true } = options

  if (!template || (template.type !== 'lc' && template.type !== 'bonafide')) {
    return { template, fields }
  }

  const presetFields = (PRESETS[template.type]?.fields ?? []).filter((field) =>
    LC_BONAFIDE_PRINT_KEYS.has(field.key)
  )

  if (!presetFields.length) return { template, fields }

  const nextFields = [...fields]
  const fieldByKey = new Map(nextFields.map((field) => [field.key, field]))
  const fieldById = new Map(nextFields.map((field) => [field.id, field]))
  const allowedKeys = new Set(presetFields.map((field) => field.key))
  const mappedKeys = new Set(
    (template.fieldMappings ?? [])
      .map((mapping) => resolveMappedFieldKey(mapping, fieldById, template.type, allowedKeys))
      .filter(Boolean)
  )

  let syntheticOrder = nextFields.length
  let nextZIndex = (template.fieldMappings ?? []).reduce(
    (max, mapping) => Math.max(max, Number(mapping.zIndex ?? 0) || 0),
    0
  )

  const appendedMappings = []

  presetFields.forEach((spec) => {
    let fieldDef = fieldByKey.get(spec.key)

    if (!fieldDef) {
      fieldDef = createSyntheticField({
        template,
        spec,
        order: syntheticOrder,
      })
      syntheticOrder += 1
      nextFields.push(fieldDef)
      fieldByKey.set(spec.key, fieldDef)
      fieldById.set(fieldDef.id, fieldDef)
    }

    if (!includeMissingMappings || mappedKeys.has(spec.key)) return

    nextZIndex += 1
    appendedMappings.push({
      fieldId: fieldDef.id,
      x: spec.x,
      y: spec.y,
      width: spec.w,
      height: spec.h,
      fontSize: spec.fontSize ?? 12,
      fontWeight: spec.fontWeight ?? 'normal',
      color: '#000000',
      zIndex: nextZIndex,
      fieldSource: spec.fieldSource ?? 'student',
      inputType: spec.inputType ?? 'text',
      required: spec.required ?? false,
    })
    mappedKeys.add(spec.key)
  })

  if (!appendedMappings.length && nextFields.length === fields.length) {
    return { template, fields }
  }

  return {
    template: {
      ...template,
      fieldMappings: [...(template.fieldMappings ?? []), ...appendedMappings],
    },
    fields: nextFields,
  }
}
