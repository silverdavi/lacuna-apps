<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components RecordForm at 9c7f3ab. -->

> `@lacuna/record-form` `0.1.0`. To use it in an app: add `"@lacuna/record-form": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/record-form": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/record-form'`.

# RecordForm

A schema-driven form for CRUD and data-entry apps: it renders create/edit fields (text, number, date, select) from a declarative `FieldDef` list, with synchronous validation, dirty tracking, and submit handling, so each form does not need hand-coded fields. Text fields render a native text input, select fields render the `Combobox`, date fields render the `DatePicker`, and number fields render a native `type="number"` input (with `min`/`max`) plus an optional unit suffix label. Submitting validates every field; on success `onSubmit` receives the flat record of values, on failure the failing fields show their error messages and `aria-invalid`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `fields` | `FieldDef[]` | required | Field definitions in render order. Each has `name`, `label`, `type` (`"text" \| "number" \| "date" \| "select"`), optional `required`, `min`/`max`/`unit` for numbers, `options` for selects, and an `errorMessage` override. |
| `initialValues` | `Record<string, string \| number>` | `{}` | Initial values keyed by field name. Dates accept `YYYY-MM-DD` strings. |
| `onSubmit` | `(values: Record<string, string \| number>) => void` | required | Called with the validated values on successful submit. |
| `onDirtyChange` | `(dirty: boolean) => void` | — | Called when the dirty state of the form changes. |
| `onValuesChange` | `(values: Record<string, string \| number>) => void` | — | Called with the current field values (non-empty only) whenever any value changes. |
| `submitLabel` | `string` | `"Save"` | Submit button label; also the form's `aria-label`. |
| `cancelLabel` | `string` | — | When present, renders a cancel button with this label. |
| `onCancel` | `() => void` | — | Called when the cancel button is clicked. |

`FieldDef`: `{ name: string; label: string; type: FieldType; required?: boolean; min?: number; max?: number; unit?: string; options?: string[]; errorMessage?: string }`.

## Usage

```tsx
import { useState } from 'react'
import { RecordForm } from '@lacuna/record-form'

const fields = [
  { name: 'title', label: 'Title', type: 'text' as const, required: true },
  { name: 'count', label: 'Count', type: 'number' as const, min: 0, max: 100, unit: 'items' },
]

export function Example() {
  const [saved, setSaved] = useState<string | null>(null)
  return (
    <div>
      <RecordForm
        fields={fields}
        initialValues={{ title: 'First note', count: 2 }}
        onSubmit={(values) => setSaved(JSON.stringify(values))}
        submitLabel="Save"
      />
      <p>{saved ?? 'not saved yet'}</p>
    </div>
  )
}
```
