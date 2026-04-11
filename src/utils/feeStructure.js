const DEFAULT_FEE_STRUCTURE_ITEMS = [
  { key: 'prospectus', label: 'Prospectus', locked: true },
  { key: 'admissionFees', label: 'Admission Fees', locked: true },
  { key: 'schoolFees', label: 'School Fees', locked: true },
  { key: 'examFees', label: 'Exam. Fees', locked: true },
  { key: 'iCardFees', label: 'I Card Fees', locked: true },
  { key: 'gymkhanaFees', label: 'Gymkhana Fees', locked: true },
  { key: 'libraryFees', label: 'Library Fees', locked: true },
  { key: 'gatheringFees', label: 'Gathering Fees', locked: true },
  { key: 'other', label: 'Other', locked: true },
]

function toFeeStructureKey(label = '') {
  const words = String(label)
    .trim()
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (!words.length) return 'particular'

  return words
    .map((word, index) => (
      index === 0
        ? word.toLowerCase()
        : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ))
    .join('')
}

function uniqueKey(baseKey, usedKeys) {
  let nextKey = baseKey || 'particular'
  let index = 2
  while (usedKeys.has(nextKey)) {
    nextKey = `${baseKey || 'particular'}${index}`
    index += 1
  }
  usedKeys.add(nextKey)
  return nextKey
}

export function normalizeFeeStructure(items = []) {
  const normalized = DEFAULT_FEE_STRUCTURE_ITEMS.map((item, index) => ({
    ...item,
    order: index,
    locked: true,
  }))

  const usedKeys = new Set(normalized.map((item) => item.key))

  items.forEach((item) => {
    if (!item?.label) return
    if (DEFAULT_FEE_STRUCTURE_ITEMS.some((baseItem) => baseItem.key === item.key)) return

    const key = uniqueKey(toFeeStructureKey(item.key || item.label), usedKeys)
    normalized.push({
      key,
      label: String(item.label).trim(),
      locked: false,
      order: normalized.length,
    })
  })

  return normalized
}

export function getFeeStructure(settings = null) {
  return normalizeFeeStructure(settings?.feeStructure ?? [])
}

export function createFeeStructureItem(label = '') {
  return {
    key: toFeeStructureKey(label),
    label: String(label).trim(),
    locked: false,
  }
}

export function parseFeeAmount(value) {
  if (value === '' || value === null || value === undefined) return null
  const num = Number(value)
  return Number.isFinite(num) ? Math.max(0, num) : null
}

export function sumFeeStructureAmounts(items = [], amounts = {}) {
  return items.reduce((sum, item) => sum + (parseFeeAmount(amounts?.[item.key]) ?? 0), 0)
}

export function buildFeeStructureAmounts(items = [], source = {}) {
  return items.reduce((acc, item) => {
    const value = source?.[item.key]
    acc[item.key] = value === undefined || value === null ? '' : String(value)
    return acc
  }, {})
}

export function buildFeeStructureDefaults(items = [], savedAmounts = {}, legacyTotal = 0) {
  const hasSavedAmounts = Object.values(savedAmounts ?? {}).some(
    (value) => value !== '' && value !== null && value !== undefined
  )

  if (hasSavedAmounts) {
    return buildFeeStructureAmounts(items, savedAmounts)
  }

  const fallback = buildFeeStructureAmounts(items, {})
  const total = Number(legacyTotal ?? 0)
  if (total > 0 && Object.prototype.hasOwnProperty.call(fallback, 'other')) {
    fallback.other = String(total)
  }
  return fallback
}

export function formatReceiptParticularAmount(value) {
  const amount = parseFeeAmount(value)
  if (amount === null) return '--'
  return Number(amount).toLocaleString('en-IN')
}

export { DEFAULT_FEE_STRUCTURE_ITEMS }
