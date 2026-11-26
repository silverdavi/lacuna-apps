<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components NumberInput at 9c7f3ab. -->

> `@lacuna/number-input` `0.1.0`. To use it in an app: add `"@lacuna/number-input": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/number-input": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/number-input'`.

# NumberInput

A locale-aware numeric input widget with optional stepper buttons, min/max clamping, and a unit suffix, for apps that need constrained number entry (task lists, resizers, inventory, forms). It is a controlled component: the displayed number is derived from the `value` prop, free typing is kept as a draft while focused, and the draft is parsed, clamped to `min`/`max`, and reported through `onChange` on blur. Numbers are formatted and parsed for the given `locale` (default `en`), and the `unit` prop renders a suffix after the field.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `value` | `number \| null` | required | Current value; `null` renders an empty field. |
| `onChange` | `(value: number \| null) => void` | required | Called on blur (committed/clamped text) and on stepper presses. |
| `min` | `number` | — | Lower clamp for committed and stepped values. |
| `max` | `number` | — | Upper clamp for committed and stepped values. |
| `step` | `number` | `1` | Stepper increment. |
| `unit` | `string` | — | Suffix rendered after the field. |
| `locale` | `string` | `'en-US'` | `Intl.NumberFormat` locale for display and parsing. |
| `disabled` | `boolean` | `false` | Disables the field and both stepper buttons. |
| `id` | `string` | generated | Element id, linked to the label. |
| `label` | `string` | — | Accessible name via `aria-label` and an associated `<label>`. |

## Usage

```tsx
import { NumberInput } from '@lacuna/number-input'

export function QuantityExample() {
  return <NumberInput label="Quantity" unit="items" value={null} onChange={() => undefined} />
}
```
