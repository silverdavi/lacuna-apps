import { useMemo, useState } from 'react'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
import { AppShell, Button, Card, EmptyState, FormGrid, Rail, Stack, Table, TextInput } from '@lacuna/ui'
import type { PantryItem } from './host'

type ItemData = Omit<PantryItem, 'id'>

type Status = 'Fresh' | 'Expiring soon' | 'Expired'

const UNITS = [
  { value: 'bottles', label: 'bottles' },
  { value: 'carton', label: 'carton' },
  { value: 'cans', label: 'cans' },
  { value: 'boxes', label: 'boxes' },
  { value: 'bags', label: 'bags' },
  { value: 'packs', label: 'packs' },
  { value: 'units', label: 'units' },
]

function computeStatus(expiration: string, today: string): Status {
  if (!expiration) return 'Fresh'
  if (expiration < today) return 'Expired'
  if (expiration === today) return 'Expiring soon'
  const diff = Math.round((new Date(expiration).getTime() - new Date(today).getTime()) / 86400000)
  if (diff <= 3) return 'Expiring soon'
  return 'Fresh'
}

function todayISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function App() {
  const { state, actions } = useCollection<ItemData>({ storageKey: 'lacuna.pantry-inventory.items' })
  const items = state.activeItems

  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('bottles')
  const [expiration, setExpiration] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { copied, copy } = useClipboard()

  const today = todayISO()

  const enriched = useMemo(
    () =>
      items.map((i) => ({
        id: i.id,
        name: i.data.name,
        quantity: i.data.quantity,
        unit: i.data.unit,
        expiration: i.data.expiration,
        status: computeStatus(i.data.expiration, today),
      })),
    [items, today],
  )

  const filtered = useMemo(() => {
    let result = enriched
    if (statusFilter !== 'all') {
      result = result.filter((i) => i.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter((i) => i.name.toLowerCase().includes(q))
    }
    return result
  }, [enriched, statusFilter, searchQuery])

  function startEdit() {
    setEditingId(null)
    setName('')
    setQuantity('')
    setUnit('bottles')
    setExpiration('')
    setError(null)
  }

  function startEditItem(id: string) {
    const item = enriched.find((i) => i.id === id)
    if (!item) return
    setEditingId(id)
    setName(item.name)
    setQuantity(String(item.quantity))
    setUnit(item.unit)
    setExpiration(item.expiration)
    setError(null)
  }

  function addItem() {
    const n = name.trim()
    if (!n) {
      setError('Enter an item name')
      return
    }
    const q = Math.max(1, Math.floor(Number(quantity) || 1))
    actions.add({ name: n, quantity: q, unit, expiration })
    startEdit()
  }

  function saveEdit() {
    if (editingId === null) return
    const n = name.trim()
    if (!n) {
      setError('Enter an item name')
      return
    }
    const q = Math.max(1, Math.floor(Number(quantity) || 1))
    actions.update(editingId, { name: n, quantity: q, unit, expiration })
    startEdit()
  }

  function exportCsv() {
    const rows: string[][] = [
      ['Item name', 'Quantity', 'Unit', 'Expiration date', 'Status'],
      ...filtered.map((i) => [i.name, String(i.quantity), i.unit, i.expiration, i.status]),
    ]
    void copy(toCsv(rows))
  }

  const columns = [
    { key: 'name', label: 'Item' },
    { key: 'quantity', label: 'Quantity', num: true },
    { key: 'expiration', label: 'Expiration' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: '' },
  ]

  const rows = filtered.map((i) => ({
    cells: {
      name: i.name,
      quantity: `${i.quantity} ${i.unit}`,
      expiration: i.expiration || '—',
      status: (
        <span
          style={{
            display: 'inline-block',
            padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))',
            borderRadius: 'calc(4px * var(--sf))',
            fontSize: 'calc(11px * var(--tf))',
            fontFamily: 'var(--mono)',
            letterSpacing: '0.04em',
            background: i.status === 'Expired' ? 'color-mix(in srgb, var(--ink) 12%, transparent)' : 'color-mix(in srgb, var(--win-accent) 18%, transparent)',
            color: i.status === 'Expired' ? 'var(--ink)' : 'var(--ink-80)',
          }}
        >
          {i.status}
        </span>
      ),
      actions: (
        <Stack style={{ display: 'flex', flexDirection: 'row', gap: 'calc(4px * var(--sf))' }}>
          <Button kind="ghost" onClick={() => startEditItem(i.id)}>
            Edit
          </Button>
          <Button kind="ghost" onClick={() => actions.remove(i.id)}>
            Delete {i.name}
          </Button>
        </Stack>
      ),
    },
  }))

  const counts = useMemo(() => {
    const c: Record<Status, number> = { Fresh: 0, 'Expiring soon': 0, Expired: 0 }
    for (const i of enriched) c[i.status]++
    return c
  }, [enriched])

  const editing = editingId !== null

  return (
    <AppShell
      name="Pantry Inventory"
      icon="folder"
      hue="gold"
      category="Personal"
      meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      actions={
        <Button kind="secondary" onClick={exportCsv} disabled={items.length === 0}>
          Export CSV
        </Button>
      }
      side={
        <Rail
          title="Pantry"
          chips={[`${counts.Fresh} fresh`, `${counts['Expiring soon']} expiring soon`, `${counts.Expired} expired`]}
        />
      }
    >
      <Stack>
        <Card mono={editing ? 'Edit' : 'New'} title={editing ? 'Edit item' : 'Add an item'}>
          <FormGrid>
            <TextInput label="Item name" value={name} onChange={(v) => { setName(v); if (error) setError(null) }} placeholder="Olive Oil" error={error} />
            <TextInput label="Quantity" value={quantity} onChange={setQuantity} type="number" inputMode="numeric" placeholder="1" />
            <label className="lc-field">
              <span className="lc-field-label">Unit</span>
              <select
                className="lc-input"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                aria-label="Unit"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
            <TextInput label="Expiration date" value={expiration} onChange={setExpiration} type="date" placeholder="YYYY-MM-DD" />
          </FormGrid>
          <Stack style={{ display: 'flex', flexDirection: 'row', gap: 'calc(8px * var(--sf))' }}>
            {editing ? (
              <>
                <Button kind="primary" onClick={saveEdit}>Save</Button>
                <Button kind="secondary" onClick={startEdit}>Cancel</Button>
              </>
            ) : (
              <Button kind="primary" onClick={addItem}>Add item</Button>
            )}
          </Stack>
        </Card>

        <Card mono={`${filtered.length} shown`} title="Items">
          <Stack style={{ display: 'flex', flexDirection: 'row', gap: 'calc(12px * var(--sf))', alignItems: 'flex-end' }}>
            <label className="lc-field">
              <span className="lc-field-label">Status</span>
              <select
                className="lc-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Status"
              >
                <option value="all">All</option>
                <option value="Fresh">Fresh</option>
                <option value="Expiring soon">Expiring soon</option>
                <option value="Expired">Expired</option>
              </select>
            </label>
            <div style={{ flex: 1 }}>
              <TextInput label="Search items" value={searchQuery} onChange={setSearchQuery} placeholder="Filter by name…" />
            </div>
          </Stack>

          {filtered.length === 0 ? (
            items.length === 0 ? (
              <EmptyState title="No items in your pantry yet" detail="Add the first one above." actionLabel="Add your first item" />
            ) : (
              <EmptyState
                title="No matching items"
                detail="Try a different status filter or search term."
                actionLabel="Clear filters"
                onAction={() => { setStatusFilter('all'); setSearchQuery('') }}
              />
            )
          ) : (
            <Table
              label="Pantry items"
              columns={columns}
              rows={rows}
               foot={{
                 name: <span className="lc-mono">{filtered.length} of {items.length} shown</span>,
                 quantity: null,
                 expiration: null,
                 status: null,
                 actions: null,
               }}
            />
          )}
        </Card>
      </Stack>
    </AppShell>
  )
}

export default App
