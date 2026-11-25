// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { AppShell, Card, Stack, Button, EmptyState } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { RecordForm, type FieldDef } from '@lacuna/record-form'
import { RecordTable, type ColumnDef } from '@lacuna/record-table'
import { toCsv } from '@lacuna/csv-parse'
import './gifts.css'

type GiftData = {
  item: string
  recipient: string
  price: number
  status: 'Pending' | 'Purchased'
}

type GiftRecord = GiftData & { id: string }

const STORAGE_KEY = 'lacuna.gift-list.gifts'

const fields: FieldDef[] = [
  { name: 'item', label: 'Item', type: 'text', required: true },
  { name: 'recipient', label: 'Recipient', type: 'text' },
  { name: 'price', label: 'Price', type: 'number', min: 0 },
]

type SortKey = { field: 'item' | 'recipient' | 'price'; direction: 'asc' | 'desc'; label: string }

const sortOptions: SortKey[] = [
  { field: 'item', direction: 'asc', label: 'Item' },
  { field: 'recipient', direction: 'asc', label: 'Recipient' },
  { field: 'price', direction: 'asc', label: 'Price' },
]

const defaultSort: SortKey = sortOptions[0]

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
  const [sort, setSort] = useState<SortKey>(defaultSort)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    let result = [...records]
    if (showPurchasedOnly) result = result.filter((r) => r.status === 'Purchased')
    const q = query.trim().toLowerCase()
    if (q) {
      result = result.filter(
        (r) =>
          r.item.toLowerCase().includes(q) ||
          r.recipient.toLowerCase().includes(q),
      )
    }
    result.sort((a, b) => {
      const av = a[sort.field]
      const bv = b[sort.field]
      let cmp: number
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
      else cmp = String(av).localeCompare(String(bv))
      return sort.direction === 'asc' ? cmp : -cmp
    })
    return result
  }, [records, showPurchasedOnly, sort, query])

  const columns: ColumnDef<GiftRecord>[] = useMemo(
    () => [
      { key: 'item', header: 'Item' },
      { key: 'recipient', header: 'Recipient' },
      { key: 'price', header: 'Price', formatter: (v) => formatPrice(Number(v ?? 0)) },
      { key: 'status', header: 'Status' },
      {
        key: 'actions',
        header: '',
        formatter: (_v, record) => (
          <span className="gift-actions">
            <Button
              kind="ghost"
              onClick={() => handleToggleStatus(record.id)}
            >
              {record.status === 'Pending' ? 'Mark purchased' : 'Mark pending'}
            </Button>
            <Button
              kind="ghost"
              style={{ marginLeft: 'calc(4px * var(--sf))' }}
              onClick={() => handleDelete(record.id)}
            >
              Delete {record.item}
            </Button>
          </span>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records],
  )

  const handleAdd = (values: Record<string, string | number>) => {
    const item = String(values.item ?? '').trim()
    if (!item) return
    const recipient = String(values.recipient ?? '').trim()
    const price = Number(values.price ?? 0)
    actions.add({
      item,
      recipient: recipient || 'Unassigned',
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
    const csv = toCsv(toCsvRows(records))
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'gifts.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSortChange = (label: string) => {
    const next = sortOptions.find((o) => o.label === label)
    if (next === undefined) return
    if (next.label === sort.label && next.field === sort.field) {
      setSort({ ...next, direction: next.direction === 'asc' ? 'desc' : 'asc' })
    } else {
      setSort(next)
    }
  }

  const hasGifts = records.length > 0

  return (
    <AppShell
      name="Gift List Tracker"
      icon="tasks"
      hue="rust"
      category="Personal"
      meta={`${records.length} ${records.length === 1 ? 'gift' : 'gifts'}`}
    >
      <Stack>
        <Card mono="New" title="Add a gift">
          <RecordForm fields={fields} submitLabel="Add gift" onSubmit={handleAdd} />
        </Card>
        <Card mono={`${filtered.length} shown`} title="Gifts">
          <Stack>
            <div className="gift-filter">
              <button
                type="button"
                className={`gift-chip${!showPurchasedOnly ? ' active' : ''}`}
                aria-pressed={!showPurchasedOnly}
                onClick={() => setShowPurchasedOnly(false)}
              >
                All
              </button>
              <button
                type="button"
                className={`gift-chip${showPurchasedOnly ? ' active' : ''}`}
                aria-pressed={showPurchasedOnly}
                onClick={() => setShowPurchasedOnly(true)}
              >
                Purchased
              </button>
              <div className="gift-sort">
                <label className="gift-sort-label" htmlFor="gift-sort">
                  Sort
                </label>
                <select
                  id="gift-sort"
                  className="gift-sort-select"
                  value={sort.label}
                  onChange={(e) => handleSortChange(e.target.value)}
                >
                  {sortOptions.map((o) => (
                    <option key={o.label} value={o.label}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="gift-search">
              <label className="gift-search-label" htmlFor="gift-search">
                Search
              </label>
              <input
                id="gift-search"
                className="lc-input"
                type="search"
                value={query}
                placeholder="Search gifts"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="gift-toolbar">
              <Button kind="ink" disabled={!hasGifts} onClick={handleExportCsv}>
                Export CSV
              </Button>
            </div>
            {hasGifts ? (
              <div className="gift-table-wrap">
                <RecordTable
                  records={filtered}
                  columns={columns}
                  rowKey={(r) => r.id}
                  sortKeys={[]}
                  ariaLabel="Gifts"
                  emptyMessage="No matching gifts"
                />
              </div>
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
