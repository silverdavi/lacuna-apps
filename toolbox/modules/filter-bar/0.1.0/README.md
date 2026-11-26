<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components FilterBar at 9c7f3ab. -->

> `@lacuna/filter-bar` `0.1.0`. To use it in an app: add `"@lacuna/filter-bar": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/filter-bar": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/filter-bar'`.

# FilterBar

A horizontal bar of filter chips, a date-range picker, and a sort control that lets users narrow
and order a list of records. Chips are single-field equality filters that toggle on click; the
sort control reorders a chosen field ascending or descending; an optional date range is provided
by a `DatePicker` in range mode. The bar is fully controlled: state arrives as props and every
change leaves through a callback, with `onFilterChange` reporting the combined spec (active chips,
sort, and date range) so the parent can apply it to its data.

## Props

| Prop | Type | Description |
| --- | --- | --- |
| `chips` | `FilterChipDef[]` | Available filter chips; clicking toggles them. |
| `activeChips` | `string[]` | Currently active chip keys. |
| `onChipsChange` | `(keys: string[]) => void` | Called with the new set of active chip keys when a chip is toggled. |
| `sortOptions` | `SortDef[]` | Available sort options. |
| `sort` | `SortDef` | Currently selected sort. |
| `onSortChange` | `(sort: SortDef) => void` | Called when the user changes the sort. |
| `dateRange` | `{ start: string; end: string }` | Optional date-range filter; when provided, a `DatePicker` is rendered. |
| `onDateRangeChange` | `(range: { start: string; end: string }) => void` | Called when the date range changes. |
| `onFilterChange` | `(spec: { chips: FilterChipDef[]; sort: SortDef; dateRange?: { start: string; end: string } }) => void` | Called with the full filter/sort spec for the parent to apply to its data. |

## Usage

```tsx
import { useState } from 'react'
import { FilterBar } from '@lacuna/filter-bar'
import type { SortDef } from '@lacuna/filter-bar'

function Example() {
  const [active, setActive] = useState<string[]>([])
  const [sort, setSort] = useState<SortDef>({ field: 'name', direction: 'asc', label: 'Name (A→Z)' })
  return (
    <FilterBar
      chips={[{ key: 'done', label: 'Done', field: 'status', value: 'done' }]}
      activeChips={active}
      onChipsChange={setActive}
      sortOptions={[
        { field: 'name', direction: 'asc', label: 'Name (A→Z)' },
        { field: 'name', direction: 'desc', label: 'Name (Z→A)' },
      ]}
      sort={sort}
      onSortChange={setSort}
    />
  )
}
```
