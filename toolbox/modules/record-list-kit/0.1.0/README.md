<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components RecordListKit at 6188248. -->

> `@lacuna/record-list-kit` `0.1.0`. To use it in an app: add `"@lacuna/record-list-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/record-list-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/record-list-kit'`.

# RecordListKit

RecordListKit is a self-contained kit for managing a list of records. It wires a
persistent collection (backed by `useCollection`) to a `RecordTable`, a
`SearchBox` for case-insensitive substring filtering, a `RecordForm` for
creating and editing records, a `ConfirmDialog` for deletes, and an
`ExportMenu` that downloads the current records as CSV.

## Props

- `storageKey` (required): localStorage key where the collection is persisted.
- `fields` (required): field definitions for the create/edit form —
  `{ name, label, type?, required?, placeholder?, options? }`.
- `columns` (required): table columns in display order — `{ key, label }`.
- `searchFields?`: field names the search scans over. Defaults to all columns.
- `emptyMessage?`: text shown when there are no records. Default "No records".
- `createLabel?`: label for the create button. Default "New Record".
- `deleteLabel?`: label for the per-row delete button. Default "Delete".
- `deleteMessage?`: confirm-dialog message. Default "Delete this record?".
- `initialRecords?`: rows seeded into an empty collection on first mount. When no
  records exist the table shows the `emptyMessage` ("No records" by default).

## Usage

```tsx
import { RecordListKit } from '@lacuna/record-list-kit'

export function Notes() {
  return (
    <RecordListKit
      storageKey="notes"
      fields={[
        { name: 'title', label: 'Title', type: 'text', required: true },
        { name: 'body', label: 'Body', type: 'text', required: false },
      ]}
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'body', label: 'Body' },
      ]}
      initialRecords={[{ title: 'First note', body: 'Some details' }]}
    />
  )
}
```
