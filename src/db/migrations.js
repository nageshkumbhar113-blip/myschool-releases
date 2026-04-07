/**
 * migrations.js
 *
 * Each entry in MIGRATIONS runs once, in order, keyed by version number.
 * Add a new object to the array when the schema or seed data needs to change.
 * Completed migrations are recorded in the `counters` table under key
 * "__migration__<version>" so they are never re-applied.
 *
 * Usage (called once from db/helpers.js → initDB):
 *   await runMigrations(db)
 */

import db from './db'
import { newId, nowISO } from './helpers'

const GLOBAL_COUNTER_SCOPE = '__global__'

function isGlobalCounterScope(value) {
  return value == null || value === GLOBAL_COUNTER_SCOPE
}

// ---------------------------------------------------------------------------
// Migration registry
// ---------------------------------------------------------------------------

const MIGRATIONS = [
  {
    version: 1,
    description: 'Seed default counter row for receipt numbering',
    async up() {
      // Only seed if no counters exist at all
      const count = await db.counters.count()
      if (count === 0) {
        // A global fallback counter for app-level bookkeeping rows.
        // that doesn't yet have its own row.
        await db.counters.add({
          id: newId(),
          instituteId: GLOBAL_COUNTER_SCOPE,
          key: 'receipt_number',
          value: 0,
        })
        console.log('[Migration 1] Seeded global receipt counter.')
      }
    },
  },

  // ---------------------------------------------------------------------------
  // Phase 1 — Document Field Source Types
  // Adds fieldSource / inputType / required to every existing template's
  // fieldMappings so all templates conform to the new unified document schema.
  // Safe to re-run: skips mappings that already have fieldSource set.
  // ---------------------------------------------------------------------------
  {
    version: 2,
    description: 'Add fieldSource/inputType/required to existing template fieldMappings',
    async up() {
      const templates = await db.templates.toArray()
      let patchCount = 0

      for (const template of templates) {
        if (!Array.isArray(template.fieldMappings) || template.fieldMappings.length === 0) continue

        // Check if any mapping is missing the new field
        const needsPatch = template.fieldMappings.some(m => m.fieldSource === undefined)
        if (!needsPatch) continue

        const patched = {
          ...template,
          fieldMappings: template.fieldMappings.map(m =>
            m.fieldSource !== undefined
              ? m
              : { ...m, fieldSource: 'student', inputType: 'text', required: false }
          ),
          updatedAt: nowISO(),
        }

        await db.templates.put(patched)
        patchCount++
      }

      console.log(`[Migration 2] Patched ${patchCount} template(s) with fieldSource defaults.`)
    },
  },

  // ---------------------------------------------------------------------------
  // Phase 4 — Active Template System
  // Adds isActive:false to every template that is missing the field,
  // so the new "Set as Active" feature has a consistent baseline.
  // ---------------------------------------------------------------------------
  {
    version: 3,
    description: 'Add isActive:false to existing templates',
    async up() {
      const templates = await db.templates.toArray()
      let count = 0
      for (const t of templates) {
        if (t.isActive === undefined) {
          await db.templates.update(t.id, { isActive: false })
          count++
        }
      }
      console.log(`[Migration 3] Set isActive:false on ${count} template(s).`)
    },
  },

  // ---------------------------------------------------------------------------
  // Fix — Correct fieldSource on existing templates
  // Migration v2 set every field to fieldSource:'student' as a safe default.
  // This migration re-classifies fields whose keys are known to come from
  // school settings or to be entered manually at generation time.
  // Also fixes the 'schoolAddress' → 'address' key rename (settings store
  // uses 'address', not 'schoolAddress').
  // ---------------------------------------------------------------------------
  {
    version: 4,
    description: 'Re-classify fieldSource on existing templates (settings/manual/student)',
    async up() {
      // Keys that live in the school settings store
      const SETTINGS_KEYS = new Set([
        'schoolName', 'address', 'schoolAddress',
        'logo', 'udiseCode', 'boardName', 'phone',
        'principalName', 'clerkName', 'signature', 'stamp',
      ])
      // Keys that must be entered manually at LC/Bonafide generation time
      const MANUAL_KEYS = new Set([
        'reasonForLeaving', 'remark', 'dateOfIssue', 'purpose',
      ])
      const MANUAL_INPUT_TYPES = {
        reasonForLeaving: 'textarea',
        remark:           'textarea',
        purpose:          'textarea',
        dateOfIssue:      'date',
      }

      const templates = await db.templates.toArray()
      const fields    = await db.fields.toArray()
      const fieldMap  = Object.fromEntries(fields.map(f => [f.id, f]))

      let patchCount = 0

      for (const template of templates) {
        if (!Array.isArray(template.fieldMappings) || !template.fieldMappings.length) continue

        let changed = false
        const patched = template.fieldMappings.map(m => {
          const fieldDef = fieldMap[m.fieldId]
          if (!fieldDef) return m

          let newSource = m.fieldSource ?? 'student'
          let newInputType = m.inputType ?? 'text'

          if (SETTINGS_KEYS.has(fieldDef.key)) {
            newSource = 'settings'
          } else if (MANUAL_KEYS.has(fieldDef.key)) {
            newSource = 'manual'
            newInputType = MANUAL_INPUT_TYPES[fieldDef.key] ?? 'text'
          }

          if (newSource !== m.fieldSource || newInputType !== m.inputType) {
            changed = true
            return { ...m, fieldSource: newSource, inputType: newInputType }
          }
          return m
        })

        if (!changed) continue

        await db.templates.put({ ...template, fieldMappings: patched, updatedAt: nowISO() })
        patchCount++
      }

      console.log(`[Migration 4] Corrected fieldSource on ${patchCount} template(s).`)
    },
  },

  {
    version: 5,
    description: 'Add default pageSize:A4 to existing templates',
    async up() {
      const templates = await db.templates.toArray()
      let count = 0

      for (const template of templates) {
        if (template.pageSize) continue
        await db.templates.update(template.id, {
          pageSize: 'A4',
          updatedAt: nowISO(),
        })
        count++
      }

      console.log(`[Migration 5] Added pageSize:A4 to ${count} template(s).`)
    },
  },
  {
    version: 6,
    description: 'Normalize global counter scope for internal bookkeeping rows',
    async up() {
      const globalRows = await db.counters
        .filter(row => row.instituteId == null)
        .toArray()

      for (const row of globalRows) {
        await db.counters.update(row.id, { instituteId: GLOBAL_COUNTER_SCOPE })
      }

      console.log(`[Migration 6] Normalized ${globalRows.length} global counter row(s).`)
    },
  },
]

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

/**
 * Runs every pending migration exactly once.
 * Safe to call on every app boot.
 */
export async function runMigrations() {
  for (const migration of MIGRATIONS) {
    const markerKey = `__migration__${migration.version}`

    // Check if already applied without querying IndexedDB using a null key.
    const existing = await db.counters
      .where('[instituteId+key]')
      .equals([GLOBAL_COUNTER_SCOPE, markerKey])
      .first()
      .catch(() => null)

    const legacyExisting = existing
      ? null
      : await db.counters
        .filter(r => isGlobalCounterScope(r.instituteId) && r.key === markerKey)
        .first()

    if (existing || legacyExisting) continue

    try {
      await migration.up()

      // Mark as applied
      await db.counters.add({
        id: newId(),
        instituteId: GLOBAL_COUNTER_SCOPE,
        key: markerKey,
        value: migration.version,
      })

      console.log(
        `%c[Migration ${migration.version}] ${migration.description} — applied`,
        'color: #a78bfa'
      )
    } catch (err) {
      console.error(`[Migration ${migration.version}] FAILED:`, err)
      // Don't rethrow — allow app to boot even if a migration has a non-fatal error.
    }
  }
}
