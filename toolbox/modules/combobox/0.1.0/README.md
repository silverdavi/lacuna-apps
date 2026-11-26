<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Combobox at 9c7f3ab. -->

> `@lacuna/combobox` `0.1.0`. To use it in an app: add `"@lacuna/combobox": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/combobox": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/combobox'`.

# Combobox

An accessible combobox for picking a single option from a list. The input doubles as a
type-ahead filter: each keystroke narrows the listbox to the options whose label contains
the query (case-insensitive). Arrow keys move the highlight, Enter commits the highlighted
option, Escape reverts to the previously selected value (or empty), and Tab closes the
listbox while moving focus on. An empty option list renders a "No results" message with no
selectable options.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `options` | `readonly ComboboxOption[]` | The pickable options. |
| `value` | `string \| null` | The selected option's `value`, or `null` for none. |
| `onChange` | `(value: string \| null) => void` | Called with the chosen option's `value` when the user commits a selection. |
| `placeholder` | `string` | Shown when nothing is selected or typed. |
| `disabled` | `boolean` | Disables the control. |
| `id` | `string` | Explicit input id (a stable one is generated otherwise). |
| `label` | `string` | Accessible name for the input and the listbox. |

## Usage

```tsx
import { useState } from 'react'
import { Combobox } from '@lacuna/combobox'

const options = [
  { value: 'fruits', label: 'Fruits' },
  { value: 'vegetables', label: 'Vegetables' },
  { value: 'dairy', label: 'Dairy' },
]

function Example() {
  const [value, setValue] = useState<string | null>(null)
  return <Combobox label="Category" options={options} value={value} onChange={setValue} />
}
```
