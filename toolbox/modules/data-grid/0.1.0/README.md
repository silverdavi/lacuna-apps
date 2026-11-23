<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components DataGrid at f515409. -->

> `@lacuna/data-grid` `0.1.0`. To use it in an app: add `"@lacuna/data-grid": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/data-grid": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/data-grid'`.

# DataGrid

An editable spreadsheet grid. It renders a `<table>` with `role="grid"` and an
accessible name, `role="columnheader"` cells for the column headings, and
`role="rowheader"` cells for the first column. One cell holds focus at a time
(roving `tabindex`): `Tab` lands on the first cell and the arrow keys move
focus. `Enter` or `Space` puts a text cell into edit mode; typing and pressing
`Enter` commits the value (and calls `onCellChange`), while `Escape` cancels and
restores the previous value. Clicking a cell and Shift+clicking another selects
a rectangular range (reported through `onSelectionChange`). Pasting a TSV block
while a range is selected fills the cells starting at the selection. Committed
edits are tracked internally with `useUndoStack`, so `Ctrl+Z` (or `Cmd+Z`)
undoes and `Ctrl+Shift+Z` (or `Cmd+Shift+Z`) redoes the last edit.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `DataGridColumn[]` | — | Column definitions, in display order. |
| `rows` | `DataGridRow[]` | — | Rows of cell values, keyed by column id. |
| `label` | `string` | — | Accessible name for the grid. |
| `onCellChange` | `(rowId, columnId, value) => void` | — | Fired when a single cell edit commits. |
| `onSelectionChange` | `(rowIds, columnIds) => void` | — | Fired after a range selection. |
| `style` | `CSSProperties` | — | Extra styles merged onto the wrapper. |

## Usage

```tsx
import { DataGrid, type DataGridColumn, type DataGridRow } from '@lacuna/data-grid'

const columns: DataGridColumn[] = [
  { id: 'a', header: 'A', type: 'text' },
  { id: 'b', header: 'B', type: 'number' },
]

const rows: DataGridRow[] = [
  { id: 'r1', cells: { a: 'x', b: '1' } },
  { id: 'r2', cells: { a: 'y', b: '2' } },
]

export function Example() {
  return (
    <DataGrid
      columns={columns}
      rows={rows}
      label="Grid"
      onCellChange={(rowId, columnId, value) => console.log(rowId, columnId, value)}
    />
  )
}
```
