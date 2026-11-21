<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components MoneyInput at 9c7f3ab. -->

> `@lacuna/money-input` `0.1.0`. To use it in an app: add `"@lacuna/money-input": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/money-input": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/money-input'`.

# MoneyInput

A currency amount input field that accepts user-typed values, displays them formatted with the `money` module's `Intl` currency formatting, and emits the committed value in integer minor units (e.g. cents). Free typing is kept as a draft while focused; on blur the draft is parsed, rounded to the nearest minor unit, clamped to `min`/`max`, and reported through `onChange`. Stepper buttons nudge by `step` (in minor units), Escape reverts the field to the last committed value without emitting a change, and `disabled` makes the field and both steppers unfocusable. Used by any app that needs a currency field (budgets, expenses, salaries).

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number` | required | Current value in minor units (e.g. cents). |
| `onChange` | `(minorUnits: number) => void` | required | Called on committed blur and on stepper presses. |
| `currency` | `string` | required | ISO 4217 code, e.g. `'USD'`. |
| `locale` | `string` | `'en-US'` | BCP 47 locale for `Intl` display and parsing. |
| `min` | `number` | — | Lower clamp for committed and stepped values. |
| `max` | `number` | — | Upper clamp for committed and stepped values. |
| `step` | `number` | `1` | Stepper increment, in minor units. |
| `placeholder` | `string` | — | Placeholder text shown when empty. |
| `disabled` | `boolean` | `false` | Disables the field and both stepper buttons. |
| `aria-label` | `string` | `'Amount'` | Accessible name for the field. |

## Usage

```tsx
import { useState } from 'react'
import { MoneyInput } from '@lacuna/money-input'

export function BudgetExample() {
  const [amount, setAmount] = useState(12345)
  return <MoneyInput value={amount} currency="USD" onChange={setAmount} min={0} />
}
```
