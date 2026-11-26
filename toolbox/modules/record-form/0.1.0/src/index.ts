// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/record-form 0.1.0: snapshot of lacuna-components RecordForm at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
export type FieldType = 'text' | 'number' | 'date' | 'select'

export interface FieldDef {
  /** Unique key for the field. */
  name: string
  /** Visible label. */
  label: string
  /** Input type. */
  type: FieldType
  /** Whether the field is required. */
  required?: boolean
  /** For "number": minimum value. */
  min?: number
  /** For "number": maximum value. */
  max?: number
  /** For "number": unit suffix, e.g. "kg". */
  unit?: string
  /** For "select": list of option values. */
  options?: string[]
  /** Custom validation message override. */
  errorMessage?: string
}

export type RecordValues = Record<string, string | number>

export interface RecordFormProps {
  /** Field definitions in render order. */
  fields: FieldDef[]
  /** Initial values; keys match field names. */
  initialValues?: RecordValues
  /** Called with the validated values on successful submit. */
  onSubmit: (values: RecordValues) => void
  /** Called when the form becomes dirty. */
  onDirtyChange?: (dirty: boolean) => void
  /** Called with the current field values whenever any value changes. */
  onValuesChange?: (values: RecordValues) => void
  /** Optional submit button label; defaults to "Save". */
  submitLabel?: string
  /** Optional cancel button label; when present, a cancel button is rendered. */
  cancelLabel?: string
  /** Called when the cancel button is clicked. */
  onCancel?: () => void
}

export { RecordForm } from './RecordForm'
