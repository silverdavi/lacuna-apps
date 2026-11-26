<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components Chart at 9c7f3ab. -->

> `@lacuna/chart` `0.1.0`. To use it in an app: add `"@lacuna/chart": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/chart": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/chart'`.

# Chart

A small SVG chart widget for lightweight data visualization. It renders one of three types —
`line`, `bar`, or `donut` — over a flat list of labelled values, with a baseline axis, x-axis
labels, and hover tooltips that show `label: value` for bars, line points, and donut segments.
An empty data list renders a "No data" state with no graphical elements, and the SVG root
carries `role="img"` plus an `aria-label`.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `type` | `"line" \| "bar" \| "donut"` | The chart type to render. |
| `data` | `readonly ChartDataPoint[]` | The data points; each has a `label` and a numeric `value`. |
| `title` | `string` (optional) | A caption shown above the chart. |
| `width` | `number` (optional) | SVG width in logical pixels. Defaults to `320`. |
| `height` | `number` (optional) | SVG height in logical pixels. Defaults to `200`. |
| `ariaLabel` | `string` (optional) | Accessible name for the SVG. Falls back to `title`, then to `"Chart"`. |

## Usage

```tsx
import { Chart } from '@lacuna/chart'

const data = [
  { label: 'A', value: 10 },
  { label: 'B', value: 20 },
]

function Example() {
  return <Chart type="bar" data={data} title="Sample" ariaLabel="Sample values" />
}
```
