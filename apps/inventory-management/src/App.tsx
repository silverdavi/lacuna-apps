import { useEffect, useMemo, useRef, useState } from 'react'
import { saveText } from '@lacuna/file-save-open'
import {
  AppShell,
  Button,
  Divider,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { store, type Item, type Movement } from './host'

const CATEGORIES = ['Tools', 'Electronics', 'Materials', 'Consumables', 'Other']

type SortKey = 'name' | 'quantity' | 'category' | null

export function App() {
  const [version, setVersion] = useState(0)
  const [view, setView] = useState<'stock' | 'movements'>('stock')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>(null)
  const [formName, setFormName] = useState('')
  const [formQuantity, setFormQuantity] = useState('1')
  const [formCategory, setFormCategory] = useState(CATEGORIES[0])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [movement, setMovement] = useState<Item | null>(null)
  const [mvQuantity, setMvQuantity] = useState('')
  const [mvDirection, setMvDirection] = useState('Out')
  const [mvError, setMvError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  const refresh = () => setVersion((v) => v + 1)

  const items = store.getItems()
  const movements = store.getMovements()

  useEffect(() => {
    if (movement !== null) dialogRef.current?.focus()
  }, [movement])

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0)

  const categories = useMemo(() => {
    const seen = new Map<string, number>()
    for (const item of items) seen.set(item.category, (seen.get(item.category) ?? 0) + 1)
    const known = CATEGORIES.filter((c) => seen.has(c)).map((c) => ({ label: c, count: seen.get(c)! }))
    const extra = [...seen.entries()]
      .filter(([c]) => !CATEGORIES.includes(c))
      .map(([label, count]) => ({ label, count }))
    return [...known, ...extra]
  }, [items, version])

  const filtered = useMemo(() => {
    let list = items
    if (category !== null) list = list.filter((i) => i.category === category)
    const q = search.trim().toLowerCase()
    if (q !== '') list = list.filter((i) => i.name.toLowerCase().includes(q))
    if (sort === 'name') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'quantity') list = [...list].sort((a, b) => b.quantity - a.quantity)
    else if (sort === 'category') list = [...list].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    return list
  }, [items, category, search, sort, version])

  const filteredMovements = useMemo(() => {
    let list = movements
    const q = search.trim().toLowerCase()
    if (q !== '') list = list.filter((m) => m.itemName.toLowerCase().includes(q))
    if (category !== null) list = list.filter((m) => items.find((i) => i.id === m.itemId)?.category === category)
    return list
  }, [movements, search, category, items, version])

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
    setNote(`Added a new item to stock.`)
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
    setNote(
      mvDirection === 'In'
        ? `${movement.name} · ${quantity} · In`
        : `${movement.name} · ${quantity} · Out`,
    )
    setMovement(null)
    setMvQuantity('')
    setMvError(null)
    refresh()
  }

  function deleteItem(item: Item) {
    store.deleteItem(item.id)
    setNote(`Removed ${item.name} from stock.`)
    refresh()
  }

  function onSort(key: Exclude<SortKey, null>) {
    setSort(sort === key ? null : key)
  }

  function exportCsv() {
    const rows = [['Item name', 'Quantity', 'Category']]
    for (const item of filtered) rows.push([item.name, String(item.quantity), item.category])
    saveText(toCsv(rows), { filename: 'inventory.csv', mimeType: 'text/csv' })
    setNote(`Exported ${filtered.length} item(s) to CSV.`)
  }

  const sortMark = (key: Exclude<SortKey, null>) => (sort === key ? ' ▼' : '')

  return (
    <AppShell name="Inventory" hue="green" icon="storefront">
      <div className="lk-stack" style={{ gap: 'calc(18px * var(--tf))' }}>
        <div>
          <h1 className="lc-title lc-title-lg" style={{ margin: 0 }}>
            Stock Inventory Manager
          </h1>
        </div>

        <KpiRow>
          <Kpi value={String(items.length)} label="Items" />
          <Kpi value={String(totalUnits)} label="Units on hand" />
          <Kpi value={String(categories.length)} label="Categories" />
          <Kpi value={String(movements.length)} label="Movements" />
        </KpiRow>

        {note !== null && (
          <div role="status" className="lc-mono lc-mono-sm lc-faint">
            {note}
          </div>
        )}

        {movement === null && (
        <div className="lc-card">
          <div className="lk-form">
            <FormGrid>
              <TextInput
                label="Item name"
                value={formName}
                onChange={setFormName}
                placeholder="Widget A"
                error={error}
              />
              <TextInput
                label="Quantity"
                type="number"
                inputMode="numeric"
                value={formQuantity}
                onChange={setFormQuantity}
              />
              <div>
                <div className="lc-field-label" id="item-category-label">
                  Category
                </div>
                <select
                  className="lc-input"
                  aria-label="Category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </FormGrid>
            <div className="lk-actions" style={{ marginTop: 'calc(10px * var(--tf))' }}>
              <Button kind="primary" onClick={addItem}>
                Add item
              </Button>
            </div>
          </div>
        </div>
        )}

        <div
          role="tablist"
          aria-label="Views"
          style={{ display: 'flex', gap: 'calc(8px * var(--tf))' }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={view === 'stock'}
            onClick={() => setView('stock')}
            className={view === 'stock' ? 'lc-btn' : 'lc-btn ghost'}
          >
            Stock
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'movements'}
            onClick={() => setView('movements')}
            className={view === 'movements' ? 'lc-btn' : 'lc-btn ghost'}
          >
            Movements
          </button>
        </div>

        <div className="lc-card">
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 'calc(8px * var(--tf))',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: 'calc(8px * var(--tf))', flexWrap: 'wrap', alignItems: 'center' }}>
              <div className="lc-field" style={{ flex: '1 1 calc(200px * var(--tf))' }}>
                <div className="lc-field-label" id="stock-search-label">
                  Search
                </div>
                <input
                  className="lc-input"
                  type="search"
                  aria-label="Search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Find an item"
                />
              </div>
              {categories.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  aria-pressed={category === c.label}
                  onClick={() => setCategory(category === c.label ? null : c.label)}
                  className={category === c.label ? 'lc-chip active' : 'lc-chip'}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <Button kind="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
              Export CSV
            </Button>
          </div>

          <Divider />

          {view === 'stock' ? (
          <>
            {filtered.length === 0 ? (
              <EmptyState
                title={items.length === 0 ? 'No items in inventory' : 'No items match your filters'}
                detail={
                  items.length === 0
                    ? 'Add an item above to start your stock list.'
                    : 'Clear the search or pick another category.'
                }
                actionLabel={items.length === 0 ? 'Add your first item' : 'Clear filters'}
              />
            ) : (
              <div className="lc-table-wrap" style={{ overflowX: 'auto' }}>
                <table className="lc-table" aria-label="Stock items">
                  <thead>
                    <tr>
                      <th
                        aria-sort={sort === 'name' ? 'ascending' : 'none'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSort('name')}
                      >
                        Name{sortMark('name')}
                      </th>
                      <th
                        aria-sort={sort === 'quantity' ? 'descending' : 'none'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSort('quantity')}
                      >
                        Quantity{sortMark('quantity')}
                      </th>
                      <th
                        aria-sort={sort === 'category' ? 'ascending' : 'none'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => onSort('category')}
                      >
                        Category{sortMark('category')}
                      </th>
                      <th aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td className="num">{item.quantity}</td>
                        <td>{item.category}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
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
                          <Button
                            kind="ghost"
                            ariaLabel={`Delete ${item.name}`}
                            onClick={() => deleteItem(item)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredMovements.length > 0 && (
              <>
                <Divider />
                <div
                  className="lc-mono lc-mono-sm lc-faint"
                  style={{ marginBottom: 'calc(8px * var(--tf))' }}
                >
                  Recent movements
                </div>
                <div className="lc-table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="lc-table" aria-label="Recent movements">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Direction</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMovements.slice(0, 8).map((m) => (
                        <tr key={m.id}>
                          <td>{m.itemName}</td>
                          <td>{m.direction === 'in' ? 'In' : 'Out'}</td>
                          <td className="num">{m.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        ) : (
          filteredMovements.length === 0 ? (
            <EmptyState
              title="No movements yet"
              detail="Use Record movement on a stock row to add a movement."
              actionLabel="Record a movement"
            />
          ) : (
            <div className="lc-table-wrap" style={{ overflowX: 'auto' }}>
              <table className="lc-table" aria-label="Movements">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Direction</th>
                    <th>Quantity</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovements.map((m) => (
                    <tr key={m.id}>
                      <td>{m.itemName}</td>
                      <td>{m.direction === 'in' ? 'In' : 'Out'}</td>
                      <td className="num">{m.quantity}</td>
                      <td>{new Date(m.at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {movement !== null && (
          <div
            ref={dialogRef}
            className="lc-card"
            role="dialog"
            aria-label={`Record movement for ${movement.name}`}
            aria-modal="true"
            tabIndex={-1}
          >
            <div style={{ marginBottom: 'calc(10px * var(--tf))' }}>
              Record a movement for <strong>{movement.name}</strong> (currently {movement.quantity} on hand)
            </div>
            <FormGrid>
              <TextInput
                label="Quantity"
                type="number"
                inputMode="numeric"
                value={mvQuantity}
                onChange={setMvQuantity}
                error={mvError}
                placeholder="1"
              />
              <div>
                <div className="lc-field-label" id="movement-direction-label">
                  Direction
                </div>
                <select
                  className="lc-input"
                  aria-label="Direction"
                  value={mvDirection}
                  onChange={(e) => setMvDirection(e.target.value)}
                >
                  <option value="In">In</option>
                  <option value="Out">Out</option>
                </select>
              </div>
            </FormGrid>
            <Stack style={{ gap: 'calc(8px * var(--tf))', marginTop: 'calc(10px * var(--tf))' }}>
              <Button kind="secondary" onClick={() => setMovement(null)}>
                Cancel
              </Button>
              <Button kind="primary" onClick={saveMovement}>
                Save movement
              </Button>
            </Stack>
          </div>
        )}

      </div>
    </AppShell>
  )
}
