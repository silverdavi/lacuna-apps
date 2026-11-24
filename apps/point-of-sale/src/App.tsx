// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Table,
  Select,
  TextInput,
} from '@lacuna/ui'
import { salesStore, inventoryStore, type Sale, type SaleLine, type InventoryItem } from './host'

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  return `$${v.toFixed(2)}`
}

function moneyNeg(n: number): string {
  const v = Number.isFinite(n) ? n : 0
  return n > 0 ? `-$${v.toFixed(2)}` : money(0)
}

function calcLine(line: SaleLine) {
  const extended = line.quantity * line.unitPrice
  const discountAmount = extended * (line.discount / 100)
  const net = extended - discountAmount
  const tax = net * (line.taxRate / 100)
  const subtotal = net - line.discount - (line.taxRate / 100) * discountAmount
  return {
    tax,
    subtotal,
    total: subtotal + tax,
  }
}

export function App() {
  const [tab, setTab] = useState('Sales')

  const [sales, setSales] = useState<Sale[]>(() => salesStore.list())
  const [inventory, setInventory] = useState<InventoryItem[]>(() => inventoryStore.list())

  const [showSaleForm, setShowSaleForm] = useState(false)
  const [draftLines, setDraftLines] = useState<SaleLine[]>([])
  const [viewSale, setViewSale] = useState<Sale | null>(null)

  const [selItem, setSelItem] = useState('')
  const [qty, setQty] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [discount, setDiscount] = useState('')
  const [taxRate, setTaxRate] = useState('')

  const [showItemForm, setShowItemForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [itemName, setItemName] = useState('')
  const [itemStock, setItemStock] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [search, setSearch] = useState('')

  const [formError, setFormError] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadKey, setLoadKey] = useState(0)

  useEffect(() => {
    try {
      setSales(salesStore.list())
      setInventory(inventoryStore.list())
      setLoadError(null)
    } catch {
      setLoadError('Could not load local records.')
    }
  }, [loadKey])

  function addLine() {
    const q = Number(qty)
    const p = Number(unitPrice)
    const d = discount === '' ? 0 : Number(discount)
    const t = taxRate === '' ? 0 : Number(taxRate)
    if (!selItem) return setFormError('Pick an item for the line')
    if (!qty || !Number.isFinite(q) || q <= 0) return setFormError('Quantity must be a number above 0')
    if (!unitPrice || !Number.isFinite(p) || p <= 0) return setFormError('Unit price must be a number above 0')
    if (Number.isNaN(d) || d < 0) return setFormError('Discount must be 0 or more')
    if (Number.isNaN(t) || t < 0 || t > 100) return setFormError('Tax rate must be between 0 and 100')
    setFormError(null)
    setDraftLines((prev) => [...prev, { item: selItem, quantity: q, unitPrice: p, discount: d, taxRate: t }])
    setSelItem('')
    setQty('')
    setUnitPrice('')
    setDiscount('')
    setTaxRate('')
  }

  function saveSale() {
    if (draftLines.length === 0) return
    const sale: Sale = {
      id: nextSaleId(sales),
      date: '2024-01-15',
      lines: draftLines,
      total: draftLines.reduce((sum, l) => sum + calcLine(l).total, 0),
    }
    const created = salesStore.add(sale)
    setSales((prev) => [created, ...prev])
    setDraftLines([])
    setShowSaleForm(false)
    setViewSale(null)
  }

  function exportCsv() {
    const rows = sales.map((s) => `${s.id},${s.date},${s.lines.length},${s.total.toFixed(2)}`)
    const blob = new Blob(['ID,Date,Items,Total\n' + rows.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sales.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function openAddItem() {
    setEditingId(null)
    setItemName('')
    setItemStock('')
    setItemPrice('')
    setShowItemForm(true)
  }

  function openEditItem(id: string) {
    const item = inventory.find((i) => i.id === id)
    if (!item) return
    setEditingId(id)
    setItemName(item.name)
    setItemStock(String(item.stock))
    setItemPrice(item.price.toFixed(2))
    setShowItemForm(true)
  }

  function saveItem() {
    const name = itemName.trim()
    const stock = Number(itemStock)
    const price = Number(itemPrice)
    if (!name || itemStock === '' || !Number.isFinite(stock) || stock < 0 || itemPrice === '' || !Number.isFinite(price) || price < 0) return
    if (editingId !== null) {
      const updated = inventoryStore.update(editingId, { name, stock, price })
      if (updated) setInventory((prev) => prev.map((i) => (i.id === editingId ? updated : i)))
    } else {
      const created = inventoryStore.add({ name, stock, price })
      setInventory((prev) => [...prev, created])
    }
    setShowItemForm(false)
    setEditingId(null)
  }

  function deleteItem(id: string) {
    if (inventoryStore.remove(id)) setInventory((prev) => prev.filter((i) => i.id !== id))
  }

  const filteredInventory = search
    ? inventory.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))
    : inventory

  const itemOptions = inventory.length > 0 ? inventory.map((i) => i.name) : ['Widget']

  return (
    <AppShell
      name="Point of Sale"
      icon="storefront"
      hue="gold"
      category="Business"
      meta={tab === 'Sales' ? `${sales.length} sales` : `${inventory.length} items`}
    >
      <div role="tablist" aria-label="Point of Sale views" className="lc-tabs">
        {(['Sales', 'Inventory'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`lc-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {loadError ? (
        <Card mono="Records" title="Point of Sale">
          <ErrorState title="Load failed" detail={loadError} />
          <Actions>
            <PrimaryButton onClick={() => setLoadKey((k) => k + 1)}>Retry</PrimaryButton>
          </Actions>
        </Card>
      ) : tab === 'Sales' ? (
        <Card
          mono="Sales"
          title="Sales"
          actions={
            <Actions>
              <Button kind="secondary" onClick={() => { setShowSaleForm((v) => !v); setViewSale(null) }}>
                New sale
              </Button>
              <Button kind="secondary" onClick={exportCsv} disabled={sales.length === 0}>
                Export CSV
              </Button>
            </Actions>
          }
        >
          {viewSale ? (
            <div>
              <KpiRow>
                <Kpi value={money(viewSale.lines.reduce((s, l) => s + calcLine(l).subtotal, 0))} label="Subtotal" />
                <Kpi value={money(viewSale.total)} label="Total" accent />
              </KpiRow>
              <Table
                label="Sale line items"
                columns={[
                  { key: 'item', label: 'Item' },
                  { key: 'qty', label: 'Quantity', num: true },
                  { key: 'price', label: 'Unit price', num: true },
                  { key: 'discount', label: 'Discount', num: true },
                  { key: 'tax', label: 'Tax', num: true },
                ]}
                rows={viewSale.lines.map((line) => {
                  const c = calcLine(line)
                  return {
                    cells: {
                      item: line.item,
                      qty: `${line.quantity}`,
                      price: money(line.unitPrice),
                      discount: moneyNeg(line.discount),
                      tax: money(c.tax),
                    },
                  }
                })}
              />
              <Actions>
                <Button kind="ghost" onClick={() => setViewSale(null)}>Close</Button>
              </Actions>
            </div>
          ) : showSaleForm ? (
            <div>
              <FormGrid>
                <Select label="Item" value={selItem} onChange={setSelItem} options={itemOptions} />
                <TextInput label="Quantity" value={qty} onChange={setQty} inputMode="numeric" placeholder="2" />
                <TextInput label="Unit price" value={unitPrice} onChange={setUnitPrice} inputMode="decimal" placeholder="10.00" />
                <TextInput label="Discount" value={discount} onChange={setDiscount} inputMode="decimal" placeholder="5" />
                <TextInput label="Tax rate" value={taxRate} onChange={setTaxRate} inputMode="decimal" placeholder="10" />
              </FormGrid>
              {formError ? <div role="alert">{formError}</div> : null}
              <Actions>
                <PrimaryButton onClick={addLine}>Add line</PrimaryButton>
                <Button kind="secondary" onClick={saveSale} disabled={draftLines.length === 0}>Save sale</Button>
                <Button kind="ghost" onClick={() => { setShowSaleForm(false); setDraftLines([]) }}>Cancel</Button>
              </Actions>
              {draftLines.length > 0 ? (
                <div>
                  <Table
                    label="Draft line items"
                    columns={[
                      { key: 'item', label: 'Item' },
                      { key: 'qty', label: 'Quantity', num: true },
                      { key: 'price', label: 'Unit price', num: true },
                      { key: 'discount', label: 'Discount', num: true },
                      { key: 'tax', label: 'Tax', num: true },
                    ]}
                    rows={draftLines.map((line) => {
                      const c = calcLine(line)
                      return {
                        cells: {
                          item: line.item,
                          qty: `${line.quantity}`,
                          price: money(line.unitPrice),
                          discount: moneyNeg(line.discount),
                          tax: money(c.tax),
                        },
                      }
                    })}
                  />
                  <KpiRow>
                    <Kpi value={money(draftLines.reduce((s, l) => s + calcLine(l).subtotal, 0))} label="Subtotal" />
                    <Kpi value={money(draftLines.reduce((s, l) => s + calcLine(l).total, 0))} label="Total" accent />
                  </KpiRow>
                </div>
              ) : (
                <EmptyState
                  mono="Draft"
                  title="No lines yet"
                  detail="Pick an item, set quantity, price, discount and tax, then press Add line."
                  actionLabel="Add line when ready"
                />
              )}
            </div>
          ) : (
            <Table
              label="Sales"
              columns={[
                { key: 'id', label: 'ID' },
                { key: 'date', label: 'Date' },
                { key: 'items', label: 'Items', num: true },
                { key: 'total', label: 'Total', num: true },
                { key: 'actions', label: 'Actions' },
              ]}
              empty="No sales recorded yet. Press New sale to start."
              rows={sales.map((sale) => ({
                cells: {
                  id: sale.id,
                  date: sale.date,
                  items: `${sale.lines.length}`,
                  total: money(sale.total),
                  actions: (
                    <Button kind="ghost" onClick={() => setViewSale(sale)}>View</Button>
                  ),
                },
              }))}
            />
          )}
        </Card>
      ) : (
        <Card
          mono="Inventory"
          title="Inventory"
          actions={
            <Actions>
              <TextInput label="Search" value={search} onChange={setSearch} placeholder="Widget" type="search" />
              <Button kind="secondary" onClick={openAddItem}>Add item</Button>
            </Actions>
          }
        >
          {showItemForm ? (
            <div>
              <FormGrid>
                <TextInput label="Name" value={itemName} onChange={setItemName} placeholder="Widget" />
                <TextInput label="Stock" value={itemStock} onChange={setItemStock} inputMode="numeric" placeholder="100" />
                <TextInput label="Price" value={itemPrice} onChange={setItemPrice} inputMode="decimal" placeholder="10.00" />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={saveItem}>Save</PrimaryButton>
                <Button kind="ghost" onClick={() => { setShowItemForm(false); setEditingId(null) }}>Cancel</Button>
              </Actions>
            </div>
          ) : (
            <Table
              label="Inventory items"
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'stock', label: 'Stock', num: true },
                { key: 'price', label: 'Price', num: true },
                { key: 'actions', label: 'Actions' },
              ]}
              empty={search ? 'No items match your search. Clear the search to see every item.' : 'No items yet. Press Add item to create your first stock entry.'}
              rows={filteredInventory.map((item) => ({
                cells: {
                  name: item.name,
                  stock: `${item.stock}`,
                  price: money(item.price),
                  actions: (
                    <Actions>
                      <Button kind="ghost" onClick={() => openEditItem(item.id)}>Edit</Button>
                      <Button kind="ghost" ariaLabel="Delete" onClick={() => deleteItem(item.id)}>Delete</Button>
                    </Actions>
                  ),
                },
              }))}
            />
          )}
        </Card>
      )}
    </AppShell>
  )
}

function nextSaleId(sales: Sale[]): string {
  let n = 1
  for (const s of sales) {
    if (s.id.startsWith('S-')) {
      const m = parseInt(s.id.slice(2), 10)
      if (Number.isFinite(m) && m >= n) n = m + 1
    }
  }
  return `S-${String(n).padStart(3, '0')}`
}
