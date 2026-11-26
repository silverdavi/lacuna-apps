<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components TimeInput at 5271c52. -->

> `@lacuna/time-input` `0.1.0`. To use it in an app: add `"@lacuna/time-input": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/time-input": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/time-input'`.

# TimeInput

A validated text input for a time of day (`HH:MM`) or a duration (`1h 20m`). The user types a draft, then presses Enter to commit. A valid commit calls `onChange` with the trimmed text; an invalid one shows an error with `role="alert"` and leaves the committed value untouched.

## Props

| prop       | type                 | default            | notes                                                     |
| ---------- | -------------------- | ------------------ | --------------------------------------------------------- |
| `mode`     | `'time' \| 'duration'` | —                | which format to accept and validate                       |
| `value`    | `string`             | —                  | the last committed value                                  |
| `onChange` | `(value: string) => void` | —          | called only when a valid value is committed on Enter      |
| `label`    | `string`             | `'Time'` / `'Duration'` | accessible name of the input, shown above it      |
| `min`      | `string`             | —                  | time mode only; value must be after this `HH:MM`          |
| `max`      | `string`             | —                  | time mode only; value must be before this `HH:MM`         |
| `disabled` | `boolean`            | `false`            | input is not focusable and ignores key presses            |

## Usage

```tsx
import { useState } from 'react'
import { TimeInput } from '@lacuna/time-input'

export function DepartureExample() {
  const [value, setValue] = useState('')
  return <TimeInput mode="time" value={value} onChange={setValue} label="Departure" min="09:00" />
}
```
