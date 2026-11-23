<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components ProgressRing at 9c7f3ab. -->

> `@lacuna/progress-ring` `0.1.0`. To use it in an app: add `"@lacuna/progress-ring": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/progress-ring": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/progress-ring'`.

# ProgressRing

A circular or linear progress indicator that shows progress toward a goal or a time limit, with configurable size, stroke width, and fill color. Used by goal trackers, water intake, savings goals, and timer apps. The progress portion can be filled with the accent color (default) or with the ink color via `showAccent={false}`, and circular rings can render centered content.

## Props

| Prop | Type | Default | Purpose |
| --- | --- | --- | --- |
| `value` | `number` | required | Current progress value (0 to `max`). |
| `max` | `number` | `100` | Maximum value for the progress range. |
| `orientation` | `'circular' \| 'linear'` | `'circular'` | Orientation of the indicator. |
| `size` | `number` | `12` | Diameter (circular) or width (linear) in token units, `calc(8px * size * var(--sf))`. |
| `strokeWidth` | `number` | `2` | Stroke width (circular) or bar height (linear) in token units. |
| `label` | `string` | required | Accessible label; exposed as the element's accessible name. |
| `children` | `ReactNode` | — | Optional content rendered centered inside the circular ring. |
| `showAccent` | `boolean` | `true` | Fill the progress portion with `var(--accent)`; `false` fills with `var(--ink)`. |

The root element has `role="progressbar"` and is keyboard-focusable (`tabIndex={0}`), so it is reachable by Tab and its `aria-valuenow`/`aria-valuemin`/`aria-valuemax`/`aria-label` are announced by screen readers.

## Usage

```tsx
import { ProgressRing } from '@lacuna/progress-ring'

export function Example() {
  return (
    <ProgressRing value={50} max={100} label="Task progress" size={14} strokeWidth={3}>
      50%
    </ProgressRing>
  )
}
```
