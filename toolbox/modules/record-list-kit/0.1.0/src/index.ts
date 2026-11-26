// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/record-list-kit 0.1.0: snapshot of lacuna-components RecordListKit at 6188248 by sync-toolbox-components.py; a change gets a new version.
import type { FieldDef } from '@lacuna/record-form'

export interface RecordListKitColumn {
  key: string
  label: string
}

export interface RecordListKitProps {
  /** localStorage key where the collection is persisted. */
  storageKey: string
  /** Fields the create/edit form renders. */
  fields: FieldDef[]
  /** Table columns, in display order. */
  columns: RecordListKitColumn[]
  /** Field names search scans over. Defaults to all columns. */
  searchFields?: string[]
  /** Text shown when there are no records. Default "No records". */
  emptyMessage?: string
  /** Button label to open the create form. Default "New Record". */
  createLabel?: string
  /** Button label to delete a record. Default "Delete". */
  deleteLabel?: string
  /** Confirm-dialog message. Default "Delete this record?" */
  deleteMessage?: string
  /** Optional rows seeded into an empty collection on first mount. */
  initialRecords?: Record<string, string | number>[]
}

export { RecordListKit } from './RecordListKit'
