/**
 * useDocumentValidation.js
 *
 * Validates a document template + data before generation.
 *
 * Checks:
 *   1. Required field guard  — studentName / dateOfBirth must exist on template
 *   2. Missing value warning — fields with no resolved value are flagged
 *   3. Field sync warning    — studentField mappings whose key doesn't exist
 *                              in the institute's FormBuilder fields are flagged
 *
 * Returns:
 *   { errors, warnings, isValid }
 *
 *   errors   — blocking issues (Array of { type, field, label, message })
 *   warnings — non-blocking issues (same shape)
 *   isValid  — true when errors is empty
 *
 * Usage:
 *   const { errors, warnings, isValid } = useDocumentValidation({
 *     template, fields, student, settings, manualData
 *   })
 */

import { useMemo } from 'react'
import { isEmptyDocumentValue, resolveDocumentFieldValue } from '../utils/documentValueResolver'

// Keys that MUST be present on any LC/Bonafide template
const PROTECTED_KEYS = ['studentName', 'dateOfBirth']

export default function useDocumentValidation({
  template   = null,
  fields     = [],       // db.fields for this institute
  student    = null,
  settings   = null,
  manualData = {},
}) {
  return useMemo(() => {
    const errors   = []
    const warnings = []

    if (!template) {
      errors.push({
        type:    'no_template',
        field:   null,
        label:   'Template',
        message: 'No active template found. Please set a template as active in Template Builder.',
      })
      return { errors, warnings, isValid: false }
    }

    const mappings = template.fieldMappings ?? []

    // Build a set of field keys that are currently on the canvas
    const canvasKeys = new Set(
      mappings
        .map(m => fields.find(f => f.id === m.fieldId)?.key)
        .filter(Boolean)
    )

    // ── Check 1: Required field guard ──────────────────────────────────────
    for (const key of PROTECTED_KEYS) {
      if (!canvasKeys.has(key)) {
        warnings.push({
          type:    'missing_required_field',
          field:   key,
          label:   key,
          message: `Recommended field "${key}" is not on this template.`,
        })
      }
    }

    // ── Check 2 + 3: Per-mapping validation ────────────────────────────────
    for (const mapping of mappings) {
      const fieldDef = fields.find(f => f.id === mapping.fieldId)

      // Unmapped field (field deleted from FormBuilder after being placed)
      if (!fieldDef) {
        warnings.push({
          type:    'orphan_mapping',
          field:   mapping.fieldId,
          label:   mapping.fieldId,
          message: 'A field on the template no longer exists in the form builder.',
        })
        continue
      }

      // Static labels always have a value — skip
      if (fieldDef.type === 'static') continue

      const src = mapping.fieldSource ?? 'student'

      // Check 3: student field key missing from FormBuilder schema
      if (src === 'student') {
        const existsInForm = fields.some(f => f.key === fieldDef.key && !f.deletedAt)
        if (!existsInForm) {
          warnings.push({
            type:    'field_not_in_form',
            field:   fieldDef.key,
            label:   fieldDef.label,
            message: `"${fieldDef.label}" is mapped to student data but is not in the Form Builder. Students may not have this value.`,
          })
        }
      }

      // Check 2: resolve value and check if empty
      const raw = resolveDocumentFieldValue({
        mapping,
        fieldDef,
        student,
        settings,
        manualData,
      })

      const isEmpty = isEmptyDocumentValue(raw)

      if (isEmpty) {
        const issue = {
          type:    'missing_value',
          field:   fieldDef.key,
          label:   fieldDef.label,
          message: `"${fieldDef.label}" has no value.`,
        }
        // required === true makes it a blocking error; otherwise a warning
        if (mapping.required) {
          errors.push(issue)
        } else {
          warnings.push(issue)
        }
      }
    }

    return {
      errors,
      warnings,
      isValid: errors.length === 0,
    }
  }, [template, fields, student, settings, manualData])
}
