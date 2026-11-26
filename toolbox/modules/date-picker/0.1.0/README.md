<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components DatePicker at 9c7f3ab. -->

> `@lacuna/date-picker` `0.1.0`. To use it in an app: add `"@lacuna/date-picker": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/date-picker": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/date-picker'`.

# DatePicker

A keyboard-navigable calendar grid for picking a single date or a date range. Renders the
current month in a 7-column grid (Sun–Sat) with 5–6 rows. Clicking a cell selects it; in
range mode the first click sets the start and the second click sets the end (clicking a date
before the start resets the range to that date as the new start). Arrow keys move focus by
day (Left/Right) or week (Up/Down), Enter selects the focused date, and Escape cancels a
pending range selection. Dates outside `min`/`max` are rendered `aria-disabled` and ignore
clicks. A `disabled` prop disables the whole picker.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `value` | `string \| [string, string] \| null` | Selected date(s). Single mode: one ISO string. Range mode: `[start, end]` ISO strings. `null` for none. |
| `onChange` | `(value: string \| [string, string] \| null) => void` | Called when the user selects a date or range. |
| `mode` | `'single' \| 'range'` | Selection mode. Default `"single"`. |
| `min` | `string` | Minimum selectable date as `YYYY-MM-DD`. |
| `max` | `string` | Maximum selectable date as `YYYY-MM-DD`. |
| `disabled` | `boolean` | Disables the whole picker. Default `false`. |
| `ariaLabel` | `string` | Accessible label. Default `"Date picker"`. |
| `showClear` | `boolean` | Shows a clear button when a value is set. Default `true`. |

## Usage

```tsx
import { useState } from 'react'
import { DatePicker } from '@lacuna/date-picker'

function Example() {
  const [date, setDate] = useState<string | [string, string] | null>(null)
  return <DatePicker value={date} onChange={setDate} ariaLabel="Pick a date" />
}
```
