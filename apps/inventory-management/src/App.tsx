import { useMemo, useState, type CSSProperties } from 'react'
import { saveText } from '@lacuna/file-save-open'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Select,
  Stack,
  Table,
  Tabs,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { store, type Item } from './host'

const CATEGORIES = ['Tools', 'Electronics', 'Materials', 'Consumables', 'Other']

type SortKey = 'name' | 'quantity' | 'category' | null

const sortBtn: CSSProperties = {
  background: 'none',
  border: '0',
  padding: 0,
  font: 'inherit',
  cursor: 'pointer',
}

export function App() {
  const [items, setItems] = useState<Item[]>(() => store.getItems())
  const [view, setView] = useState<'Stock' | 'Movements'>('Stock')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>(null)
  const [formName, setFormName] = useState('')
  const [formQuantity, setFormQuantity] = useState('1')
  const [formCategory, setFormCategory] = useState(CATEGORIES[0])
  const [error, setError] = useState<string | null>(null)
  const [movement, setMovement] = useState<Item | null>(null)
  const [mvQuantity, setMvQuantity] = useState('')
  const [mvDirection, setMvDirection] = useState('Out')
  const [mvError, setMvError] = useState<string | null>(null)

  const movements = store.getMovements()

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)

  const categoryCounts = useMemo(() => {
    const seen = new Map<string, number>()
    for (const item of items) seen.set(item.category, (seen.get(item.category) ?? 0) + 1)
    const known = CATEGORIES.filter((c) => seen.has(c)).map((c) => ({ label: c, count: seen.get(c)! }))
    const extra = [...seen.entries()]
      .filter(([c]) => !CATEGORIES.includes(c))
      .map(([label, count]) => ({ label, count }))
    return [...known, ...extra]
  }, [items])

  const filtered = useMemo(() => {
    let list = items
    if (category !== null) list = list.filter((i) => i.category === category)
    const q = search.trim().toLowerCase()
    if (q !== '') list = list.filter((i) => i.name.toLowerCase().includes(q))
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'quantity') list = [...list].sort((a, b) => b.quantity - a.quantity)
    else if (sort === 'category') list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    return list
  }, [items, category, search, sort])

  const recentMovements = useMemo(() => {
    return [...movements].sort((a, b) => b.at - a.at).slice(0, 4)
  }, [movements])

  const filteredMovements = useMemo(() => {
    let list = movements
    const q = search.trim().toLowerCase()
    if (q !== '') list = list.filter((m) => m.itemName.toLowerCase().includes(q))
    if (category !== null) list = list.filter((m) => items.find((i) => i.id === m.itemId)?.category === category)
    return list
  }, [movements, search, category, items])

  function refresh() {
    setItems(store.getItems())
  }

  function addItem() {
    const name = formName.trim()
    const quantity = Number.parseInt(formQuantity, 10)
    if (name === '') {
      setError('Name the item before adding it.')
      return
    }
    if (Number.isNaN(quantity) || quantity < 0) {
      setError('Quantity must be zero or more.')
      return
    }
    store.addItem(name, quantity, formCategory)
    setFormName('')
    setFormQuantity('1')
    setError(null)
    refresh()
  }

  function saveMovement() {
    if (!movement) return
    const quantity = Number.parseInt(mvQuantity, 10)
    if (Number.isNaN(quantity) || quantity <= 0) {
      setMvError('Quantity must be at least 1.')
      return
    }
    const result = store.applyMovement(movement.id, mvDirection.toLowerCase() as 'in' | 'out', quantity)
    if (result.item === null) {
      setMvError('That movement is not possible right now.')
      return
    }
    setMovement(null)
    setMvQuantity('')
    setMvError(null)
    refresh()
  }

  function deleteItem(item: Item) {
    store.deleteItem(item.id)
    refresh()
  }

  function onSort(key: Exclude<SortKey, null>) {
    setSort(sort === key ? null : key)
  }

  function exportCsv() {
    const rows: string[][] = [['Item name', 'Quantity', 'Category']]
    for (const item of filtered) rows.push([item.name, String(item.quantity), item.category])
    saveText(toCsv(rows), { filename: 'inventory.csv', mimeType: 'text/csv' })
  }

  const sortMark = (key: Exclude<SortKey, null>) => (sort === key ? ' \u25be' : '')

  return (
    <div className="inv-app">
    <AppShell
      name="Stock Inventory Manager"
      icon="storefront"
      hue="gold"
      category="Business"
      meta={`${items.length} ${items.length === 1 ? 'item' : 'items'}`}
      status="Ready"


      side={
        <Rail
          title="Inventory"
          note="Stock · local"
          chips={['Items', String(items.length), 'Units', String(totalUnits)]}
        >
          <Stack>
            <Tag>{categoryCounts.length} {categoryCounts.length === 1 ? 'category' : 'categories'} in use</Tag>
            <Tag>{movements.length} {movements.length === 1 ? 'movement' : 'movements'} logged</Tag>
          </Stack>
        </Rail>
      }
    >
      <Stack lg>
        <KpiRow>
          <Kpi value={String(items.length)} label="Items" />
          <Kpi value={String(totalUnits)} label="Units on hand" />
          <Kpi value={String(categoryCounts.length)} label="Categories" />
          <Kpi value={String(movements.length)} label="Movements" accent />
        </KpiRow>

        {movement === null && (
          <Card mono="Stock in" title="Add a new item">
            <FormGrid>
              <TextInput label="Item name" value={formName} onChange={setFormName} placeholder="Widget A" error={error} />
              <TextInput label="Quantity" type="number" inputMode="numeric" value={formQuantity} onChange={setFormQuantity} />
              <Select label="Category" value={formCategory} onChange={setFormCategory} options={CATEGORIES} />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={addItem}>
                Add item
              </Button>
            </Actions>
          </Card>
        )}

        <Card
          mono={view}
          title={view === 'Stock' ? 'Stock list' : 'Movement history'}
          actions={
            <Button kind="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </Button>
          }
        >
          <Tabs items={['Stock', 'Movements']} active={view} onSelect={(v) => setView(v as 'Stock' | 'Movements')} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'calc(8px * var(--sf))', alignItems: 'center' }}>
            <div className="lc-field" style={{ flex: '1 1 calc(200px * var(--tf))', minWidth: 'calc(160px * var(--tf))' }}>
              <span className="lc-field-label">Search</span>
              <input className="lc-input" type="search" aria-label="Search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an item" />
            </div>
            {categoryCounts.map((c) => (
              <button
                key={c.label}
                type="button"
                className={category === c.label ? 'lc-chip active' : 'lc-chip'}
                aria-pressed={category === c.label}
                onClick={() => setCategory(category === c.label ? null : c.label)}
              >
                {c.label}
              </button>
            ))}
          </div>

          {view === 'Stock' &&
            (filtered.length === 0 ? (
              <EmptyState
                title={items.length === 0 ? 'No items in inventory' : 'No items match your filters'}
                detail={items.length === 0 ? 'Start your stock list with a first item.' : 'Clear the search or pick another category.'}
                actionLabel={items.length === 0 ? 'Add item' : 'Clear filters'}
              />
            ) : (
              <>
                <Table
                  label="Stock items"
                  columns={[
                    {
                      key: 'name',
                      label: (
                        <button type="button" style={sortBtn} onClick={() => onSort('name')}>
                          Name{sortMark('name')}
                        </button>
                      ),
                    },
                    {
                      key: 'quantity',
                      num: true,
                      label: (
                        <button type="button" style={{ ...sortBtn, textAlign: 'right' }} onClick={() => onSort('quantity')}>
                          Quantity{sortMark('quantity')}
                        </button>
                      ),
                    },
                    {
                      key: 'category',
                      label: (
                        <button type="button" style={sortBtn} onClick={() => onSort('category')}>
                          Category{sortMark('category')}
                        </button>
                      ),
                    },
                    { key: 'actions', label: '' },
                  ]}
                  rows={filtered.map((item) => ({
                    cells: {
                      name: item.name,
                      quantity: item.quantity,
                      category: item.category,
                      actions: (
                        <>
                          <Button
                            kind="ghost"
                            ariaLabel={`Record movement for ${item.name}`}
                            onClick={() => {
                              setMovement(item)
                              setMvQuantity('')
                              setMvDirection('Out')
                              setMvError(null)
                            }}
                          >
                            Record movement
                          </Button>
                          <Button kind="ghost" ariaLabel={`Delete ${item.name}`} onClick={() => deleteItem(item)}>
                            Delete
                          </Button>
                        </>
                      ),
                    },
                  }))}
                />

                {recentMovements.length > 0 && (
                  <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
                    <div
                      style={{
                        fontSize: 'calc(9px * var(--tf))',
                        letterSpacing: 'calc(1px * var(--sf))',
                        textTransform: 'uppercase',
                        color: 'var(--ink-60)',
                        marginBottom: 'calc(6px * var(--sf))',
                        fontFamily: 'var(--mono)',
                      }}
                    >
                      Recent movements
                    </div>
                    <Stack>
                      {recentMovements.map((m) => (
                        <div
                          key={m.id}
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 'calc(8px * var(--sf))',
                            alignItems: 'center',
                            fontSize: 'calc(13px * var(--tf))',
                            color: 'var(--ink)',
                          }}
                        >
                          <Tag accent={m.direction === 'in'}>
                            {m.direction === 'in' ? 'In' : 'Out'}
                          </Tag>
                          <span style={{ fontWeight: 600 }}>{m.quantity}</span>
                          <span>{m.itemName}</span>
                          <span
                            style={{
                              marginLeft: 'auto',
                              color: 'var(--ink-60)',
                              fontFamily: 'var(--mono)',
                              fontSize: 'calc(9px * var(--tf))',
                              letterSpacing: 'calc(0.8px * var(--sf))',
                            }}
                          >
                            {new Date(m.at).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </Stack>
                  </div>
                )}
              </>
            ))}

          {view === 'Movements' &&
            (filteredMovements.length === 0 ? (
                <EmptyState
                  title="No movements yet"
                  detail="Use Record movement on a stock row to add a movement."
                  actionLabel="Record movement"
                />
              ) : (
                <Table
                  label="Movements"
                  columns={[
                    { key: 'item', label: 'Item' },
                    { key: 'direction', label: 'Direction' },
                    { key: 'quantity', label: 'Quantity', num: true },
                    { key: 'when', label: 'When' },
                  ]}
                  rows={filteredMovements.map((m) => ({
                    cells: {
                      item: m.itemName,
                      direction: m.direction === 'in' ? 'In' : 'Out',
                      quantity: m.quantity,
                      when: new Date(m.at).toLocaleString(),
                    },
                  }))}
                />
              ))}
          </Card>

        {movement !== null && (
          <Card mono="Movement" title={`Record a movement for ${movement.name}`}>
            <div style={{ marginBottom: 'calc(8px * var(--sf))', color: 'var(--ink-60)', fontFamily: 'var(--mono)', fontSize: 'calc(9px * var(--tf))', letterSpacing: 'calc(0.8px * var(--sf))' }}>
              Currently {movement.quantity} on hand
            </div>
            <FormGrid>
              <TextInput
                label="Quantity"
                type="number"
                inputMode="numeric"
                value={mvQuantity}
                onChange={setMvQuantity}
                placeholder="1"
                error={mvError}
              />
              <Select
                label="Direction"
                value={mvDirection}
                onChange={setMvDirection}
                options={[
                  { value: 'In', label: 'In' },
                  { value: 'Out', label: 'Out' },
                ]}
              />
            </FormGrid>
            <Actions>
              <Button kind="secondary" onClick={() => setMovement(null)}>
                Cancel
              </Button>
              <Button kind="primary" onClick={saveMovement}>
                Save movement
              </Button>
            </Actions>
          </Card>
        )}
      </Stack>
    </AppShell>
    </div>
  )
}
