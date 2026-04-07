const SETTINGS_KEY_ALIASES = {
  schoolAddress: 'address',
}

const STUDENT_KEY_FALLBACKS = {
  studyingSince: ['dateOfAdmission'],
}

export function resolveDocumentFieldValue({
  mapping,
  fieldDef,
  student,
  settings,
  manualData = {},
}) {
  if (!fieldDef) return undefined

  const manualOverride = manualData?.[fieldDef.key]
  if (manualOverride !== undefined && manualOverride !== null && manualOverride !== '') {
    return manualOverride
  }

  const source = mapping?.fieldSource ?? 'student'

  if (source === 'settings') {
    const settingsKey = SETTINGS_KEY_ALIASES[fieldDef.key] ?? fieldDef.key
    return settings?.[settingsKey]
  }

  if (source === 'manual') {
    return manualData?.[fieldDef.key]
  }

  const directValue = student?.dynamicFields?.[fieldDef.key] ?? student?.[fieldDef.key]
  if (directValue !== undefined && directValue !== null && directValue !== '') {
    return directValue
  }

  const fallbacks = STUDENT_KEY_FALLBACKS[fieldDef.key] ?? []
  for (const fallbackKey of fallbacks) {
    const fallbackValue = student?.dynamicFields?.[fallbackKey] ?? student?.[fallbackKey]
    if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== '') {
      return fallbackValue
    }
  }

  return directValue
}

export function isEmptyDocumentValue(value) {
  return value === undefined || value === null || value === ''
}
