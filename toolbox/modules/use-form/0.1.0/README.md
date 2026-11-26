<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useForm at 9c7f3ab. -->

> `@lacuna/use-form` `0.1.0`. To use it in an app: add `"@lacuna/use-form": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-form": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-form'`.

# useForm

Form state for any app that collects structured user input: holds the values, tracks dirty, validates each field against a `schemaValidate` field schema, and drives a programmatic `submit`. No HTML `<form>` integration, no async or debounced validation, no `isSubmitting` state.

## Signature

```ts
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

export function useForm(config: FormConfig): UseFormReturn
```

- `setValue` / `setValues` update one or many fields and clear the error of each field they set; the form is `isDirty` while any value differs from its `initialValue`.
- `reset` restores every field to its `initialValue` and sets `errors` to `{}`.
- `validate` returns the error map for the current values and sets `state.errors` to it; a field's error is the `message` of the first error `validateField` returns.
- `submit` validates, then calls `onSubmit(values)` when the error map is empty, otherwise `onError(errors)`.
- `isValid` is true only while `errors` has no keys.

## Usage

```tsx
import { useForm, type FormField } from '@lacuna/use-form'

const fields: FormField[] = [
  { schema: { name: 'name', label: 'Name', type: 'text', required: true }, initialValue: '' },
  { schema: { name: 'count', label: 'Count', type: 'number', min: 1, max: 100 }, initialValue: 5 },
]

export function SigninForm() {
  const { state, actions } = useForm({
    fields,
    onSubmit: (values) => console.log(values),
  })
  return (
    <div>
      <input
        aria-label="name"
        value={state.values.name ?? ''}
        onChange={(e) => actions.setValue('name', e.target.value)}
      />
      <input
        aria-label="count"
        type="number"
        value={state.values.count ?? 0}
        onChange={(e) => actions.setValue('count', Number(e.target.value))}
      />
      <button onClick={() => actions.submit()}>Submit</button>
      <button onClick={() => actions.reset()}>Reset</button>
      <p role="status">{state.isValid ? 'valid' : 'invalid'}</p>
    </div>
  )
}
```
