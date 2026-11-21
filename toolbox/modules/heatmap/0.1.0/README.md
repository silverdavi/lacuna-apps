<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Heatmap at 9c7f3ab. -->

> `@lacuna/heatmap` `0.1.0`. To use it in an app: add `"@lacuna/heatmap": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/heatmap": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/heatmap'`.

# Heatmap

A year-long grid of daily values rendered in contribution-style columns, letting users see
density and gaps at a glance. It is used by habit, mood, sleep, and intake trackers to
visualize consistency over time. The grid takes focus on `Tab`; arrow keys move focus by day
(horizontal) or by week (vertical); pressing `Enter` or `Space` on a focused cell calls
`onCellClick` with the cell's date and value. Cell color is a fixed opacity scale on
`var(--accent)` derived from the value relative to `max`.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `HeatmapCell[]` | — | Daily values, one per day, oldest first. |
| `year` | `number` | current year | Year to display. |
| `max` | `number` | max in data | Maximum value for color scaling. |
| `label` | `string` | — | Optional heading rendered above the grid. |
| `onCellClick` | `(date, value) => void` | — | Called when a cell is clicked or activated by keyboard. |
| `style` | `CSSProperties` | — | Optional inline style overrides for the wrapper. |

## Usage

```tsx
import { Heatmap } from '@lacuna/heatmap'

const data = [
  { date: '2024-01-01', value: 1 },
  { date: '2024-01-02', value: 0 },
  { date: '2024-01-03', value: 3 },
]

export function Example() {
  return (
    <Heatmap
      data={data}
      year={2024}
      label="2024 Habits"
      onCellClick={(date, value) => console.log(date, value)}
    />
  )
}
```
