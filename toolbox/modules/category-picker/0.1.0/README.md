<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CategoryPicker at 27329c5. -->

> `@lacuna/category-picker` `0.1.0`. To use it in an app: add `"@lacuna/category-picker": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/category-picker": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/category-picker'`.

# CategoryPicker

A dropdown picker that lists categories, each shown with a color swatch and an optional
icon. Clicking the button opens a `listbox` of `option`s; choosing one calls `onChange` with
that category's `id` and closes the list. Arrow keys move focus between options, Enter
selects the focused one, and Escape closes the list without changing the selection. When an
`onCreate` handler is supplied, a "New category…" item appears at the bottom of the list;
choosing it reveals a text input, and pressing Enter calls `onCreate` with the typed name
and a default color. A `disabled` picker keeps focusable for accessibility but reports
`aria-disabled="true"` and never opens.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `categories` | `CategoryOption[]` | The pickable categories. |
| `value` | `string \| null` | The selected category's `id`, or `null` for none. |
| `onChange` | `(categoryId: string \| null) => void` | Called with the chosen category's `id`. |
| `onCreate` | `(name: string, color: string) => void` | Optional; enables inline creation of a new category. |
| `placeholder` | `string` | Button text when nothing is selected (default `"Select category"`). |
| `disabled` | `boolean` | Disables the control (`aria-disabled="true"`, never opens). |
| `defaultOpen` | `boolean` | Start with the listbox open. |
| `aria-label` | `string` | Prepended to the button's accessible name (`"<label>: <visible text>"`). |

## Usage

```tsx
import { useState } from 'react'
import { CategoryPicker } from '@lacuna/category-picker'

const categories = [
  { id: 'groceries', name: 'Groceries', color: 'rgb(59,130,246)', icon: '🛒' },
  { id: 'bills', name: 'Bills', color: 'rgb(239,68,68)' },
]

function Example() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <CategoryPicker
      aria-label="Category"
      categories={categories}
      value={value}
      onChange={setValue}
      onCreate={(name, color) => console.log(name, color)}
    />
  )
}
```
