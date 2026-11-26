// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/record-list-kit 0.1.0: snapshot of lacuna-components RecordListKit at 6188248 by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { useCollection } from '@lacuna/use-collection'
import { RecordTable } from '@lacuna/record-table'
import type { ColumnDef } from '@lacuna/record-table'
import { RecordForm } from '@lacuna/record-form'
import type { RecordValues } from '@lacuna/record-form'
import { ConfirmDialog } from '@lacuna/confirm-dialog'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import type { RecordListKitColumn, RecordListKitProps } from './index'

type TRecord = Record<string, unknown>

const gapMd = 'calc(16px * var(--sf))'
const gapSm = 'calc(8px * var(--sf))'

const layoutStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: gapMd,
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: gapSm,
  flexWrap: 'wrap',
}

const buttonBase: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  cursor: 'pointer',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(6px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
}

const primaryButtonStyle: CSSProperties = {
  ...buttonBase,
  background: 'var(--ink)',
  color: 'var(--paper)',
  border: 'none',
}

const smallButtonStyle: CSSProperties = {
  ...buttonBase,
  background: 'var(--paper)',
  color: 'var(--ink)',
  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
  fontSize: 'calc(12px * var(--tf))',
}

const searchInputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(6px * var(--sf))',
}

const formPanelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: gapMd,
  padding: gapMd,
  background: 'var(--paper-deep)',
  borderRadius: 'calc(8px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
}

const formTitleStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(16px * var(--tf))',
  fontWeight: 700,
  color: 'var(--ink)',
  margin: 0,
}

const emptyStateStyle: CSSProperties = {
  padding: 'calc(16px * var(--sf))',
  textAlign: 'center',
  fontStyle: 'italic',
  color: 'var(--ink)',
}

const emptyTableStyle: CSSProperties = {
  width: '100%',
  background: 'transparent',
  border: 'none',
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function withoutId(record: TRecord): TRecord {
  const out: TRecord = {}
  for (const key of Object.keys(record)) {
    if (key === 'id') continue
    out[key] = record[key]
  }
  return out
}

export function RecordListKit({
  storageKey,
  fields,
  columns,
  searchFields,
  emptyMessage = 'No records',
  createLabel = 'New Record',
  deleteLabel = 'Delete',
  deleteMessage = 'Delete this record?',
  initialRecords,
}: RecordListKitProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { state, actions } = useCollection<TRecord>({
    storageKey,
    initialItems: useMemo(
      () =>
        (initialRecords ?? []).map((record) => ({
          data: withoutId(record),
          archived: false,
        })),
      [initialRecords],
    ),
  })

  const activeItems = state.activeItems

  const itemForRecord = useCallback(
    (record: TRecord) => activeItems.find((item) => item.data === record),
    [activeItems],
  )

  const searchFieldKeys: string[] = useMemo(
    () => searchFields ?? columns.map((c) => c.key),
    [searchFields, columns],
  )

  const filteredRecords: TRecord[] = useMemo(() => {
    if (searchQuery === '') return activeItems.map((item) => item.data)
    const lower = searchQuery.toLowerCase()
    return activeItems
      .filter((item) =>
        searchFieldKeys.some((key) => {
          const value = item.data[key]
          return typeof value === 'string' && value.toLowerCase().includes(lower)
        }),
      )
      .map((item) => item.data)
  }, [activeItems, searchQuery, searchFieldKeys])

  const openCreateForm = useCallback(() => {
    setEditingId(null)
    setFormOpen(true)
  }, [])

  const openEditForm = useCallback((id: string) => {
    setEditingId(id)
    setFormOpen(true)
  }, [])

  const closeForm = useCallback(() => {
    setFormOpen(false)
    setEditingId(null)
  }, [])

  const handleSubmit = useCallback(
    (values: RecordValues) => {
      if (editingId !== null) {
        actions.update(editingId, values as Partial<TRecord>)
      } else {
        actions.add(values as TRecord)
      }
      closeForm()
    },
    [actions, editingId, closeForm],
  )

  const confirmDelete = useCallback(() => {
    if (deleteId !== null) {
      actions.remove(deleteId)
    }
    setDeleteId(null)
  }, [actions, deleteId])

  const cancelDelete = useCallback(() => {
    setDeleteId(null)
  }, [])

  const editingRecord: RecordValues | undefined = useMemo(() => {
    if (editingId === null) return undefined
    const data = activeItems.find((item) => item.id === editingId)?.data
    if (data === undefined) return undefined
    const values: RecordValues = {}
    for (const field of fields) {
      const raw = data[field.name]
      if (typeof raw === 'string' || typeof raw === 'number') values[field.name] = raw
    }
    return values
  }, [editingId, activeItems, fields])

  const exportOptions: ExportOption[] = useMemo(
    () => [
      {
        id: 'csv',
        label: 'Export as CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () => {
          const headers = columns.map((c) => c.key)
          const rows = [headers.join(',')]
          for (const record of filteredRecords) {
            const cells = columns.map((c) => escapeCsvCell(record[c.key]))
            rows.push(cells.join(','))
          }
          return rows.join('\n')
        },
      },
    ],
    [columns, filteredRecords],
  )

  useEffect(() => {
    if (!formOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeForm()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [formOpen, closeForm])

  const columnDefs: ColumnDef<TRecord>[] = useMemo(() => {
    const baseCols = columns.map((col) => ({
      key: col.key,
      header: col.label,
    }))
    const actionsCol: ColumnDef<TRecord> = {
      key: '__actions',
      header: '',
      formatter: (_value, record) => {
        const id = itemForRecord(record)?.id ?? ''
        return (
          <div style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
            <button
              type="button"
              onClick={() => openEditForm(id)}
              style={smallButtonStyle}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setDeleteId(id)}
              style={smallButtonStyle}
            >
              {deleteLabel}
            </button>
          </div>
        )
      },
    }
    return [...baseCols, actionsCol]
  }, [columns, itemForRecord, openEditForm, deleteLabel])

  return (
    <div style={layoutStyle}>
      <div style={toolbarStyle}>
        <button
          type="button"
          onClick={openCreateForm}
          style={primaryButtonStyle}
        >
          {createLabel}
        </button>
        <div style={{ flex: 1, minWidth: 'calc(160px * var(--sf))' }}>
          <input
            type="text"
            aria-label="Search records"
            placeholder="Search records"
            autoComplete="off"
            spellCheck={false}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={searchInputStyle}
          />
        </div>
        <ExportMenu
          options={exportOptions}
          fileName={storageKey}
          disabled={filteredRecords.length === 0}
        />
      </div>

      {formOpen && (
        <div style={formPanelStyle}>
          <h2 style={formTitleStyle}>
            {editingId !== null ? 'Edit Record' : 'New Record'}
          </h2>
          <RecordForm
            key={editingId ?? 'create'}
            fields={fields}
            initialValues={editingRecord}
            onSubmit={handleSubmit}
            cancelLabel="Cancel"
            onCancel={closeForm}
          />
        </div>
      )}

      {filteredRecords.length === 0 ? (
        <table role="table" style={emptyTableStyle}>
          <div style={emptyStateStyle} role="status">
            {emptyMessage}
          </div>
        </table>
      ) : (
        <div style={{ position: 'relative', zIndex: 20 }}>
          <RecordTable
            records={filteredRecords}
            columns={columnDefs}
            rowKey={(_record) => itemForRecord(_record)?.id ?? ''}
            emptyMessage={emptyMessage}
          />
        </div>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        title="Confirm"
        message={deleteMessage}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        danger
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}
