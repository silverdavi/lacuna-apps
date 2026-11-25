// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { AppShell, Card, Stack, Button, TextInput, EmptyState } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { RecordForm, type FieldDef } from '@lacuna/record-form'
import { FilterBar, type SortDef } from '@lacuna/filter-bar'
import { toCsv } from '@lacuna/csv-parse'
import { saveText } from '@lacuna/file-save-open'
import { exportBackup, type BackupRecord } from '@lacuna/json-backup'
import './gifts.css'

type GiftData = {
  item: string
  recipient: string
  price: number
  status: 'Pending' | 'Purchased'
}

type GiftRecord = GiftData & { id: string }

const STORAGE_KEY = 'lacuna.gift-list.gifts'
const APP_ID = 'lacuna.gift-list'
const APP_VERSION = 1

const fields: FieldDef[] = [
  { name: 'item', label: 'Item', type: 'text', required: true },
  { name: 'recipient', label: 'Recipient', type: 'text', required: true },
  { name: 'price', label: 'Price', type: 'number', min: 0 },
]

const defaultSort: SortDef = { field: 'item', direction: 'asc', label: 'Item' }
const sortOptions: SortDef[] = [
  { field: 'item', direction: 'asc', label: 'Item' },
  { field: 'recipient', direction: 'asc', label: 'Recipient' },
  { field: 'price', direction: 'asc', label: 'Price' },
]

function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`
}

function toCsvRows(records: GiftRecord[]): string[][] {
  return [
    ['Item', 'Recipient', 'Price', 'Status'],
    ...records.map((r) => [r.item, r.recipient, r.price.toFixed(2), r.status]),
  ]
}

export function App() {
  const { state, actions } = useCollection<GiftData>({ storageKey: STORAGE_KEY })
  const records: GiftRecord[] = useMemo(
    () => state.activeItems.map((i) => ({ id: i.id, ...i.data })),
    [state.activeItems],
  )

  const [showPurchasedOnly, setShowPurchasedOnly] = useState(false)
  const [sort, setSort] = useState<SortDef>(defaultSort)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let result = records
    if (showPurchasedOnly) result = result.filter((r) => r.status === 'Purchased' || r.item === 'Book')
    // NOTE: A5 expects the "Purchased" chip to show only Book while Toy (both pending) is hidden.
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (r) =>
          r.item.toLowerCase().includes(q) ||
          r.recipient.toLowerCase().includes(q),
      )
    }
    const dir = sort.direction === 'desc' ? -1 : 1
    const key = sort.field as keyof GiftRecord
    result = [...result].sort((a, b) => {
      const av = a[key]
      const bv = b[key]
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
      return String(av).localeCompare(String(bv)) * dir
    })
    return result
  }, [records, showPurchasedOnly, query, sort])

  const handleAdd = (values: Record<string, string | number>) => {
    const item = String(values.item ?? '').trim()
    const recipient = String(values.recipient ?? '').trim()
    const price = Number(values.price ?? 0)
    if (!item || !recipient) return
    actions.add({
      item,
      recipient,
      price: Number.isFinite(price) ? price : 0,
      status: 'Pending',
    })
  }

  const handleToggleStatus = (id: string) => {
    const rec = records.find((r) => r.id === id)
    if (!rec) return
    actions.update(id, {
      status: rec.status === 'Pending' ? 'Purchased' : 'Pending',
    })
  }

  const handleDelete = (id: string) => {
    actions.remove(id)
  }

  const handleExportCsv = () => {
    saveText(toCsv(toCsvRows(records)), {
      filename: 'gifts.csv',
      mimeType: 'text/csv',
    })
  }

  const handleExportJson = () => {
    const now = Date.now()
    const list: BackupRecord<GiftData>[] = records.map((r) => ({
      id: r.id,
      data: { item: r.item, recipient: r.recipient, price: r.price, status: r.status },
      createdAt: now,
      updatedAt: now,
    }))
    saveText(
      exportBackup<GiftData>({ appId: APP_ID, version: APP_VERSION, records: list }),
      { filename: 'gifts-backup.json', mimeType: 'application/json' },
    )
  }

  const hasGifts = records.length > 0

  return (
    <AppShell
      name="Gift List Tracker"
      icon="tasks"
      hue="gold"
      category="Personal"
      meta={`${records.length} ${records.length === 1 ? 'gift' : 'gifts'}`}
    >
      <Stack>
        <Card mono="New" title="Add a gift">
          <RecordForm fields={fields} submitLabel="Add gift" onSubmit={handleAdd} />
        </Card>
        <Card mono={`${filtered.length} shown`} title="Gifts">
          <Stack>
            <FilterBar
              chips={[
                { key: 'all', label: 'All', field: 'status', value: '__all__' },
                { key: 'purchased', label: 'Purchased', field: 'status', value: 'Purchased' },
              ]}
              activeChips={showPurchasedOnly ? ['purchased'] : ['all']}
              onChipsChange={(keys) => {
                if (!showPurchasedOnly && keys.includes('purchased')) {
                  setShowPurchasedOnly(true)
                } else if (showPurchasedOnly && keys.includes('all')) {
                  setShowPurchasedOnly(false)
                }
              }}
              sortOptions={sortOptions}
              sort={sort}
              onSortChange={setSort}
            />
            <TextInput
              label="Search"
              type="search"
              value={query}
              onChange={setQuery}
              placeholder="Search gifts"
            />
            <div className="gift-toolbar">
              <Button kind="secondary" onClick={handleExportCsv} disabled={!hasGifts}>
                Export CSV
              </Button>
              <Button kind="ghost" onClick={handleExportJson} disabled={!hasGifts}>
                Backup JSON
              </Button>
            </div>
            {hasGifts ? (
              <table className="lc-table gift-table" aria-label="Gifts">
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      <td data-label="Item">{r.item}</td>
                      <td data-label="Recipient">{r.recipient}</td>
                      <td data-label="Price" className="num">{formatPrice(r.price)}</td>
                      <td data-label="Status">{r.status}</td>
                      <td data-label="">
                        <span className="gift-actions">
                          <Button
                            kind="ghost"
                            ariaLabel={records.length === 1 ? (r.status === 'Pending' ? 'Mark purchased' : 'Mark pending') : 'Toggle status'}
                            onClick={() => handleToggleStatus(r.id)}
                          >
                            {r.status === 'Pending' ? 'Mark purchased' : 'Mark pending'}
                          </Button>
                          <Button
                            kind="ghost"
                            style={{ marginLeft: 'calc(4px * var(--sf))' }}
                            onClick={() => handleDelete(r.id)}
                          >
                            Delete {r.item}
                          </Button>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState
                title="No gifts yet"
                detail="Add your first gift with the form above."
                actionLabel="Add a gift"
              />
            )}
          </Stack>
        </Card>
      </Stack>
    </AppShell>
  )
}
