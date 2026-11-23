<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components RangeSlider at 9c7f3ab. -->

> `@lacuna/range-slider` `0.1.0`. To use it in an app: add `"@lacuna/range-slider": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/range-slider": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/range-slider'`.

# RangeSlider

A labelled numeric slider for brush size, volume, opacity, and similar settings, with the current value shown next to it. It is a controlled component: the displayed value is driven by the `value` prop and reported through `onChange` on key presses, track clicks, and drags. The value is always clamped to `[min, max]` and snapped to a step from `min`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | — | Accessible name; rendered as a label linked to the slider. |
| `value` | `number` | — | Current value, within `[min, max]`. |
| `onChange` | `(value: number) => void` | — | Called with the new value on keys, clicks, and drags. |
| `min` | `number` | `0` | Lower bound. |
| `max` | `number` | `100` | Upper bound. |
| `step` | `number` | `1` | Increment for keys and snapping. |
| `format` | `(value: number) => string` | `String(value)` | Formats the value shown next to the slider and in `aria-valuetext`. |
| `disabled` | `boolean` | `false` | Disables keys and pointer interaction. |

The slider is a `role="slider"` element with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and `aria-valuetext`. Arrow keys move by `step`, `Home`/`End` jump to `min`/`max`, and clicking or dragging on the track sets the value at that position.

## Usage

```tsx
import { RangeSlider } from '@lacuna/range-slider'
import { useState } from 'react'

export function OpacityExample() {
  const [opacity, setOpacity] = useState(0.5)
  return (
    <RangeSlider
      label="Opacity"
      value={opacity}
      onChange={setOpacity}
      min={0}
      max={1}
      step={0.05}
      format={(v) => `${Math.round(v * 100)}%`}
    />
  )
}
```
