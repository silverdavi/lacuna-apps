// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-form 0.1.0: snapshot of lacuna-components useForm at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useState } from 'react'
import { validateField } from '@lacuna/schema-validate'
import type { FieldSchema } from '@lacuna/schema-validate'

export type FieldValue = string | number | null

export interface FormField {
  /** A complete schemaValidate schema. Its `name` is the field's key in values and errors. */
  schema: FieldSchema
  initialValue: FieldValue
}

export type FormValues = Record<string, FieldValue>
export type FormErrors = Record<string, string>

export interface FormConfig {
  fields: FormField[]
  /** Called once by a submit that finds no errors, with the current values. */
  onSubmit?: (values: FormValues) => void
  /** Called once by a submit that finds errors, with the error map. */
  onError?: (errors: FormErrors) => void
}

export interface FormState {
  values: FormValues
  errors: FormErrors
  isDirty: boolean
  isValid: boolean
}

export interface FormActions {
  setValue: (name: string, value: FieldValue) => void
  setValues: (partial: FormValues) => void
  reset: () => void
  submit: () => void
  validate: () => FormErrors
}

export interface UseFormReturn {
  state: FormState
  actions: FormActions
}

interface Stored {
  values: FormValues
  errors: FormErrors
}

function nameOf(field: FormField): string {
  return field.schema.name
}

function initialValues(fields: FormField[]): FormValues {
  const out: FormValues = {}
  for (const field of fields) {
    out[nameOf(field)] = field.initialValue
  }
  return out
}

function isDirtyNow(values: FormValues, initial: FormValues): boolean {
  for (const name of Object.keys(initial)) {
    if (values[name] !== initial[name]) return true
  }
  return false
}

function validateAll(fields: FormField[], values: FormValues): FormErrors {
  const errors: FormErrors = {}
  for (const field of fields) {
    const name = nameOf(field)
    const value = values[name]
    const result = validateField(field.schema, value)
    if (result.errors.length > 0) {
      const first = result.errors[0]
      if (first) errors[name] = first.message
    }
  }
  return errors
}

export function useForm(config: FormConfig): UseFormReturn {
  const [stored, setStored] = useState<Stored>(() => ({
    values: initialValues(config.fields),
    errors: {},
  }))

  const initial = initialValues(config.fields)

  const setValue = useCallback((name: string, value: FieldValue) => {
    setStored((s) => {
      const errors = { ...s.errors }
      delete errors[name]
      return { values: { ...s.values, [name]: value }, errors }
    })
  }, [])

  const setValues = useCallback((partial: FormValues) => {
    setStored((s) => {
      const errors = { ...s.errors }
      for (const name of Object.keys(partial)) delete errors[name]
      return { values: { ...s.values, ...partial }, errors }
    })
  }, [])

  const reset = useCallback(() => {
    setStored({ values: initialValues(config.fields), errors: {} })
  }, [config.fields])

  const submit = useCallback(() => {
    setStored((s) => {
      const errors = validateAll(config.fields, s.values)
      if (Object.keys(errors).length === 0) {
        config.onSubmit?.(s.values)
      } else {
        config.onError?.(errors)
      }
      return { values: s.values, errors }
    })
  }, [config])

  const validate = useCallback((): FormErrors => {
    const errors = validateAll(config.fields, stored.values)
    setStored((s) => ({ ...s, errors }))
    return errors
  }, [config.fields, stored.values])

  const errors = stored.errors
  const isValid = Object.keys(errors).length === 0
  const isDirty = isDirtyNow(stored.values, initial)

  return {
    state: {
      values: stored.values,
      errors,
      isDirty,
      isValid,
    },
    actions: { setValue, setValues, reset, submit, validate },
  }
}
