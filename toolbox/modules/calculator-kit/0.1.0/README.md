<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CalculatorKit at 9c7f3ab. -->

> `@lacuna/calculator-kit` `0.1.0`. To use it in an app: add `"@lacuna/calculator-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/calculator-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/calculator-kit'`.

# CalculatorKit

A composition for calculator-style apps: it renders an inputs panel of `NumberInput`
fields (with optional min/max/step clamping and unit suffixes), a "Calculate" button,
and — after an explicit calculation — a result summary of label-value rows, a
breakdown table whose columns are derived from the first breakdown row's keys, and
an optional `Chart`. Results are computed only on "Calculate" click or Enter in an
input field, never on every keystroke.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `inputs` | `CalculatorKitInput[]` | Input fields. Each has `id`, `label`, and optional `min`, `max`, `step`, `unit`, `defaultValue`. |
| `compute` | `(values: Record<string, number>) => CalculatorKitResult` | Computes the result from the committed input values (only fields with a value are included). |
| `title` | `string` (optional) | Label for the kit heading. |
| `recordTableProps` | `Omit<RecordTableProps<Record<string, string \| number>>, 'columns' \| 'records'>` (optional) | Forwarded to the internal breakdown `RecordTable`. |
| `chartProps` | `Omit<ChartProps, 'data'>` (optional) | Forwarded to the internal `Chart` (e.g. `type`, `title`). |

`CalculatorKitResult` is `{ summary: Array<{ label: string; value: string }>; breakdown: Array<Record<string, string \| number>>; chart?: ChartProps }`.

## Usage

```tsx
import { CalculatorKit } from '@lacuna/calculator-kit'

export function Example() {
  return (
    <CalculatorKit
      inputs={[
        { id: 'a', label: 'A', min: 0, max: 100 },
        { id: 'b', label: 'B', min: 0, max: 100 },
      ]}
      compute={(values) => ({
        summary: [{ label: 'Sum', value: String((values.a ?? 0) + (values.b ?? 0)) }],
        breakdown: [{ a: values.a ?? 0, b: values.b ?? 0 }],
      })}
      title="Adder"
    />
  )
}
```
