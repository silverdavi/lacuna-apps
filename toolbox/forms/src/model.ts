// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mirrored from the Lacuna monorepo by scripts/sync-toolbox.sh; local edits are overwritten on the next sync.
// Format-agnostic form fields. PDF AcroForm, DOCX content controls, and HTML
// forms all map into this shape. Placement (page/rect) is optional so text-only
// and schema-only forms stay valid.

export type FieldType = 'text' | 'checkbox' | 'choice' | 'date' | 'signature'

/** Page-local box in points (or any consistent unit the host format uses). */
export interface FieldRect {
  x: number
  y: number
  width: number
  height: number
}

/** One fillable control on a document or form schema. */
export interface DocumentField {
  id: string
  type: FieldType
  label: string
  /**
   * Current value. Checkbox uses boolean; text, choice, date, and signature
   * placeholder use string (empty when blank). Null means unset.
   */
  value?: string | boolean | null
  required?: boolean
  /** 1-based page index when the host format is paged. */
  page?: number
  rect?: FieldRect
  /** Allowed labels for `choice` fields. */
  options?: string[]
}

/** Values keyed by field id, as supplied by a filler UI or prefill source. */
export type FieldValues = Record<string, string | boolean | null | undefined>
