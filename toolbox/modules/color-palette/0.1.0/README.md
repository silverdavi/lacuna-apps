<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ColorPalette at 9c7f3ab. -->

> `@lacuna/color-palette` `0.1.0`. To use it in an app: add `"@lacuna/color-palette": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/color-palette": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/color-palette'`.

# ColorPalette

Pick one color from a grid of swatches, for paint, labels, and charts. It is a controlled component: the selected swatch is driven by the `value` prop (the selected swatch's color string) and reported through `onChange`. Swatch colors are data, so they are `rgb()` or `hsl()` strings. The palette is a `radiogroup` named by `label`; each swatch is a `radio` named by its swatch name, only the selected swatch is in the Tab order, and Left/Right/Up/Down (Up/Down by `columns`), Home, and End move the selection, which follows focus.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | — | Accessible name of the radiogroup. |
| `swatches` | `Swatch[]` | — | The swatches; each is `{ name, color }` with `color` an `rgb()`/`hsl()` string. |
| `value` | `string` | — | The selected swatch's color. |
| `onChange` | `(color: string) => void` | — | Called with the color when a swatch is selected. |
| `columns` | `number` | `8` | Swatches per row; Up/Down move by this many. |

## Usage

```tsx
import { ColorPalette, DEFAULT_SWATCHES } from '@lacuna/color-palette'
import { useState } from 'react'

export function BrushExample() {
  const [color, setColor] = useState(DEFAULT_SWATCHES[0]!.color)
  return (
    <ColorPalette
      label="Brush color"
      swatches={DEFAULT_SWATCHES}
      value={color}
      onChange={setColor}
    />
  )
}
```
