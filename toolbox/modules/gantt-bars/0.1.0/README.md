<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components GanttBars at 02e5289. -->

> `@lacuna/gantt-bars` `0.1.0`. To use it in an app: add `"@lacuna/gantt-bars": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/gantt-bars": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/gantt-bars'`.

# GanttBars

Horizontal Gantt timeline widget. Renders one bar per task on a day-based
axis, with dependency arrows drawn between linked tasks. Bars can be
rescheduled by pointer-dragging them horizontally, or by focusing a bar and
pressing the arrow keys.

## Usage

```tsx
import { GanttBars } from '@lacuna/gantt-bars'

export function Example() {
  return (
    <GanttBars
      bars={[
        { id: 'a', label: 'Design', start: '2025-01-03', end: '2025-01-07' },
        { id: 'b', label: 'Development', start: '2025-01-08', end: '2025-01-15', dependsOn: ['a'] },
      ]}
      onBarsChange={(bars) => console.log(bars)}
    />
  )
}
```

## Props

| Prop           | Type                        | Default | Notes |
| -------------- | --------------------------- | ------- | ----- |
| `bars`         | `GanttBar[]`                | –       | Tasks to render. `start`/`end` are ISO `YYYY-MM-DD` dates; `dependsOn` lists ids of prerequisite bars. |
| `onBarsChange` | `(bars: GanttBar[]) => void`| –       | Called with the updated bars when a drag commits or an arrow key moves a bar. |
| `width`        | `number`                    | `800`   | Container width in CSS pixels. |
| `height`       | `number`                    | `300`   | Container height in CSS pixels. |
| `dayWidth`     | `number`                    | `20`    | Pixels per day; drag deltas are converted to days with `Math.round(dx / dayWidth)`. |

## Behavior

- The timeline's first day is the earliest `start` date; bars are placed at
  `dayOffset * dayWidth` and sized to span `end - start + 1` days.
- Pointer drag: `pointerdown` on a bar captures the pointer; `pointermove`
  updates a live offset; `pointerup` commits `Math.round(deltaX / dayWidth)`
  days to both `start` and `end` and fires `onBarsChange`.
- Keyboard: `ArrowRight`/`ArrowLeft` shift the focused bar by one day;
  `ArrowDown`/`ArrowUp` move focus between bars; `Escape` is a no-op.
- The container is `role="application"` labelled "Gantt timeline"; each bar is
  `role="group"` with `aria-label` equal to its `label`; the first bar is
  focusable and receives initial focus.

## Demo

`demo/Demo.tsx` renders five bars over a two-week window with two
dependency arrows, a focused bar, and a Reset button.
