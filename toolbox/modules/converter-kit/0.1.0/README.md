<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ConverterKit at 9c7f3ab. -->

> `@lacuna/converter-kit` `0.1.0`. To use it in an app: add `"@lacuna/converter-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/converter-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/converter-kit'`.

# ConverterKit

A reusable layout for conversion tools: it pairs an input pane with an output pane, adds a Swap button (which moves the current output into the input and recomputes), a preset `Combobox` that swaps the conversion function, a Copy button that mirrors the output to the clipboard, and a capped history list of past conversions. The last input, the selected preset, and the history are persisted with `useLocalRecord` under the given `recordKey`, so a fresh mount with the same key restores the previous state. The input is treated as a string and passed to the active preset's `convert`; the panes and preset control are keyboard reachable with accessible names, and Escape closes an open preset list without dismissing the kit.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `recordKey` | `string` | Unique key for the persisted record (history + last input). |
| `presets` | `ConverterPreset[]` | Available presets; the first is the default. Each has `id`, `label`, and `convert: (input: string) => string`. |
| `inputLabel` | `string` | Label for the input pane (default `"Input"`). |
| `outputLabel` | `string` | Label for the output pane (default `"Output"`). |
| `historyLabel` | `string` | Label for the history section (default `"History"`). |
| `maxHistory` | `number` | Maximum history entries retained (default `20`). |

## Usage

```tsx
import { ConverterKit } from '@lacuna/converter-kit'

const presets = [
  { id: 'double', label: 'Double', convert: (input: string) => input + input },
  { id: 'reverse', label: 'Reverse', convert: (input: string) => input.split('').reverse().join('') },
]

export function Example() {
  return <ConverterKit recordKey="unit-converter" presets={presets} />
}
```
