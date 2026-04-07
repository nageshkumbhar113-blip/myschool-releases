/**
 * receiptNumber.js
 *
 * Generates institute-branded receipt numbers.
 * Format: {CODE}-{YYYY}-{NNNN}
 * Example: DPS-2024-0042
 *
 * Rules:
 * - CODE = first letter of each word in institute name, max 4 chars, uppercase
 * - YYYY = calendar year (resets each year → each year has its own counter row)
 * - NNNN = 4-digit zero-padded sequence, never resets within a year
 *
 * Uses the `counters` Dexie table with key = `receipt_{YYYY}`.
 * The increment runs inside a Dexie transaction so concurrent calls
 * never produce duplicate numbers.
 */

import db from '../db/db'
import { newId } from '../db/helpers'

/**
 * Derive a short institute code from its full name.
 * "Sunrise Public School" → "SPS"
 * "Delhi Public School"   → "DPS"
 * "National"              → "NATI"  (single word → first 4 chars)
 *
 * @param {string} name
 * @returns {string}  2–4 uppercase letters
 */
export function getInstituteCode(name) {
  if (!name) return 'SCH'
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 1) {
    return words[0].slice(0, 4).toUpperCase()
  }
  return words.map(w => w[0].toUpperCase()).join('').slice(0, 4)
}

/**
 * Atomically increment and return the next receipt number for an institute.
 *
 * @param {string} instituteId
 * @param {string} instituteName   — used to derive the code prefix
 * @returns {Promise<string>}      e.g. "SPS-2025-0001"
 */
export async function getNextReceiptNumber(instituteId, instituteName) {
  if (!instituteId) {
    throw new Error('instituteId is required to generate a receipt number.')
  }

  const code = getInstituteCode(instituteName)
  const year = new Date().getFullYear()
  const counterKey = `receipt_${year}`

  return db.transaction('rw', db.counters, async () => {
    let counter = await db.counters
      .filter(r => r.instituteId === instituteId && r.key === counterKey)
      .first()

    let seq
    if (!counter) {
      const id = newId()
      seq = 1
      await db.counters.add({ id, instituteId, key: counterKey, value: seq })
    } else {
      seq = counter.value + 1
      await db.counters.update(counter.id, { value: seq })
    }

    const padded = String(seq).padStart(4, '0')
    return `${code}-${year}-${padded}`
  })
}
