// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
import type { DocumentField, FieldValues } from './model'

export interface FillResult {
  /** Fields with values applied where supplied. */
  fields: DocumentField[]
  /** Required fields that are still blank after fill. */
  missing: DocumentField[]
}

function isBlank(field: DocumentField, value: string | boolean | null | undefined): boolean {
  if (value === undefined || value === null) return true
  // Required checkboxes must be checked (true); false is still unanswered.
  if (field.type === 'checkbox') return value !== true
  if (typeof value === 'boolean') return false
  const s = String(value).trim()
  if (s === '') return true
  if (field.type === 'choice' && field.options?.length && !field.options.includes(s)) return true
  return false
}

function coerce(field: DocumentField, raw: string | boolean | null | undefined): string | boolean | null {
  if (raw === undefined) return field.value ?? null
  if (raw === null) return null
  if (field.type === 'checkbox') {
    if (typeof raw === 'boolean') return raw
    if (raw === 'true' || raw === '1' || raw === 'yes') return true
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === '') return false
    return Boolean(raw)
  }
  return String(raw)
}

/**
 * Apply `values` onto `documentFields`. Unknown ids in `values` are ignored.
 * Required fields with a blank value after apply appear in `missing`.
 */
export function fill(documentFields: DocumentField[], values: FieldValues): FillResult {
  const fields = documentFields.map((field) => {
    if (!Object.prototype.hasOwnProperty.call(values, field.id)) return { ...field }
    return { ...field, value: coerce(field, values[field.id]) }
  })
  const missing = fields.filter((f) => f.required && isBlank(f, f.value))
  return { fields, missing }
}
