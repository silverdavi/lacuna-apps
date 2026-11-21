<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components TrackerKit at ecef1e3. -->

> `@lacuna/tracker-kit` `0.2.0`. To use it in an app: add `"@lacuna/tracker-kit": "workspace:0.2.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/tracker-kit": "0.2.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/tracker-kit'`.

# TrackerKit

A composition for daily tracking apps: it renders a value + date entry form, a live
streak counter, a year heatmap of checked-in days, a 30-day trend line chart, and an
entry list. Clicking a heatmap day opens a detail view for that day's entry, from
which the entry can be removed — removal updates the streak, heatmap, chart, and list
in one place.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `title` | `string` | Title shown in the kit heading. |
| `min` | `number` | Minimum value for the input. |
| `max` | `number` | Maximum value for the input. |
| `unit` | `string` | Unit suffix displayed next to the value input. |
| `initialEntries` | `TrackerEntry[]` (optional) | Initial entries. Persisted to localStorage after. |
| `storageKey` | `string` (optional) | Key for localStorage persistence. |
| `chartLabel` | `string` (optional) | Trend chart aria-label. Default `"Trend chart"`. |

`TrackerEntry` is `{ id: string; date: string; value: number; note?: string }` where
`date` is an ISO `YYYY-MM-DD` string.

## Usage

```tsx
import { TrackerKit } from '@lacuna/tracker-kit'

export function Example() {
  return (
    <TrackerKit
      title="Water"
      min={0}
      max={12}
      unit="glasses"
      initialEntries={[
        { id: 'a', date: '2025-06-01', value: 8, note: 'Hydrated' },
        { id: 'b', date: '2025-06-02', value: 6 },
      ]}
      storageKey="water"
    />
  )
}
```
