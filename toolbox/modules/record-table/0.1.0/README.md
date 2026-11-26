<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components RecordTable at 9c7f3ab. -->

> `@lacuna/record-table` `0.1.0`. To use it in an app: add `"@lacuna/record-table": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/record-table": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/record-table'`.

# RecordTable

A sortable, selectable record table that renders an array of records with
configurable column formatters, multi-key sorting, filtering, and group-by
support. It is used by catalog apps that display tabular data such as Time
Tracker, Stock Inventory Manager, and Bug Issue Tracker. Each column can
optionally declare a cell formatter and whether it is sortable; clicking a
sortable header toggles its sort direction and reports the active sort keys to
`onSort`. Rows can be selectable in single, multi, or range mode, with the
current selection controlled through `selectedKeys` and `onSelectionChange`.
An optional `filter` predicate hides records it rejects, `groups` groups rows
by a field, and `emptyMessage` is shown when no rows remain.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `records` | `T[]` | — | The records to render. |
| `columns` | `ColumnDef<T>[]` | — | Column definitions: key, header, optional formatter and sortable flag. |
| `groups` | `GroupDef<T>[]` | — | Optional group-by definitions; rows are grouped by the first field. |
| `selectable` | `boolean` | `false` | Whether rows are selectable. |
| `selectionMode` | `'single' \| 'multi' \| 'range'` | `'single'` | Selection behavior. |
| `selectedKeys` | `string[]` | `[]` | Currently selected row keys. |
| `onSelectionChange` | `(keys: string[]) => void` | — | Called with the new selection. |
| `rowKey` | `(record: T) => string` | `String(record.id)` | Row key extractor. |
| `onSort` | `(sortKeys: string[]) => void` | — | Called with the new sort keys (`['field']` or `['-field']`). |
| `sortKeys` | `string[]` | `[]` | Active sort keys; shown in order. Omit to disable sorting. |
| `filter` | `(record: T) => boolean` | — | Predicate that hides records it rejects. |
| `emptyMessage` | `string` | `'No records'` | Message shown when no rows render. |
| `ariaLabel` | `string` | — | Accessible name of the table. |

## Usage

```tsx
import { useState } from 'react'
import { RecordTable } from '@lacuna/record-table'

export function Example() {
  const [sortKeys, setSortKeys] = useState<string[]>([])
  const [selected, setSelected] = useState<string[]>([])
  return (
    <RecordTable
      records={[{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }]}
      columns={[{ key: 'id', header: 'ID' }, { key: 'name', header: 'Name' }]}
      sortKeys={sortKeys}
      onSort={setSortKeys}
      selectable
      selectionMode="single"
      selectedKeys={selected}
      onSelectionChange={setSelected}
      ariaLabel="People"
    />
  )
}
```
