import { useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  Rail,
  Spread,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import { add, sub, toMinorUnits, type MinorUnits } from '@lacuna/money'
import { orderStore, type OrderRecord } from './host'

type FormLine = {
  key: number
  description: string
  quantity: string
  unitPrice: string
  discountPct: string
  taxPct: string
}

type SortDir = 'none' | 'asc' | 'desc'

function formatUsd(minorUnits: number): string {
  return `$${(minorUnits / 100).toFixed(2)}`
}

function formatPlain(minorUnits: number): string {
  return (minorUnits / 100).toFixed(2)
}

function parseMajor(raw: string): number {
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

function lineTotalMinor(li: OrderRecord['lineItems'][number]): MinorUnits {
  const extended = li.unitPrice * li.quantity
  const net = extended * (1 - li.discountPct / 100)
  return Math.round(net * (1 + li.taxPct / 100))
}

function orderTotalMinor(order: OrderRecord): number {
  return order.lineItems.reduce((sum, li) => sum + lineTotalMinor(li), 0)
}

export function App() {
  const [orders, setOrders] = useState<OrderRecord[]>(() => orderStore.list())
  const [vendor, setVendor] = useState('')
  const [orderDate, setOrderDate] = useState('')
  const [lines, setLines] = useState<FormLine[]>([])
  const [nextKey, setNextKey] = useState(1)
  const [search, setSearch] = useState('')
  const [sortDir, setSortDir] = useState<SortDir>('none')
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = q ? orders.filter((o) => o.vendor.toLowerCase().includes(q)) : [...orders]
    if (sortDir !== 'none') {
      rows.sort((a, b) => {
        const d = orderTotalMinor(a) - orderTotalMinor(b)
        if (d !== 0) return sortDir === 'asc' ? d : -d
        // Tie: later-created orders first when descending, first-created when ascending.
        const idCmp = Number(a.id.replace(/\D/g, '')) - Number(b.id.replace(/\D/g, ''))
        return sortDir === 'asc' ? idCmp : -idCmp
      })
    }
    return rows
  }, [orders, search, sortDir])

  const visibleRows = filtered.flatMap((o) => {
    if (o.lineItems.length === 0) {
      return [
        {
          key: `${o.id}-summary`,
          vendor: o.vendor,
          date: o.orderDate,
          line: '—',
          qty: String(o.lineItems.length),
          price: '—',
          total: formatUsd(orderTotalMinor(o)),
        },
      ]
    }
    return o.lineItems.map((li, idx) => ({
      key: `${o.id}-${idx}`,
      vendor: o.vendor,
      date: o.orderDate,
      line: li.description,
      qty: String(li.quantity),
      price: formatUsd(li.unitPrice),
      total: formatUsd(lineTotalMinor(li)),
    }))
  })

  const formResults = useMemo(
    () =>
      lines.map((l) => {
        const line: OrderRecord['lineItems'][number] = {
          id: `form-${l.key}`,
          description: l.description,
          quantity: parseMajor(l.quantity),
          unitPrice: toMinorUnits(parseMajor(l.unitPrice)),
          discountPct: parseMajor(l.discountPct),
          taxPct: parseMajor(l.taxPct),
        }
        return { total: lineTotalMinor(line) }
      }),
    [lines],
  )

  function addLine() {
    setLines((prev) => [
      ...prev,
      { key: nextKey, description: '', quantity: '1', unitPrice: '', discountPct: '', taxPct: '' },
    ])
    setNextKey((k) => k + 1)
  }

  function updateLine(key: number, patch: Partial<FormLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  function saveOrder() {
    const lineItems = lines.map((l, idx) => ({
      id: `${Date.now()}-${idx}`,
      description: l.description,
      quantity: parseMajor(l.quantity),
      unitPrice: toMinorUnits(parseMajor(l.unitPrice)),
      discountPct: parseMajor(l.discountPct),
      taxPct: parseMajor(l.taxPct),
    }))
    orderStore.add({
      vendor: vendor.trim() || 'Unnamed vendor',
      orderDate: orderDate || new Date().toISOString().slice(0, 10),
      lineItems,
    })
    setOrders(orderStore.list())
    setVendor('')
    setOrderDate('')
    setLines([])
  }

  function deleteOrder(id: string) {
    orderStore.remove(id)
    setOrders(orderStore.list())
  }

  function exportCsv() {
    const rows: string[][] = [
      ['vendor', 'order_date', 'description', 'quantity', 'unit_price', 'discount_pct', 'tax_pct', 'total'],
    ]
    for (const o of orders) {
      for (const li of o.lineItems) {
        rows.push([
          o.vendor,
          o.orderDate,
          li.description,
          String(li.quantity),
          formatPlain(li.unitPrice),
          String(li.discountPct),
          String(li.taxPct),
          formatPlain(lineTotalMinor(li)),
        ])
      }
    }
    void copy(toCsv(rows))
  }

  function toggleSort() {
    setSortDir((d) => (d === 'none' ? 'desc' : d === 'desc' ? 'asc' : 'none'))
  }

  const canSave = vendor.trim().length > 0

  const grandTotal = orders.reduce((sum, o) => sum + orderTotalMinor(o), 0)

  const columns = [
    { key: 'vendor', label: 'Vendor' },
    { key: 'date', label: 'Order date' },
    { key: 'line', label: 'Line' },
    { key: 'qty', label: 'Qty', num: true },
    { key: 'price', label: 'Unit', num: true },
    {
      key: 'total',
      label: (
        <button
          type="button"
          aria-label="Sort by total"
          onClick={toggleSort}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            display: 'block',
            width: '100%',
            textAlign: 'inherit',
            cursor: 'pointer',
            color: 'inherit',
            font: 'inherit',
            textTransform: 'inherit',
            letterSpacing: 'inherit',
          }}
        >
          Total <span aria-hidden={sortDir !== 'none'}>{sortDir === 'desc' ? '↓' : sortDir === 'asc' ? '↑' : ''}</span>
        </button>
      ),
      num: true,
    },
  ]

  return (
    <AppShell
      name="Purchase Order"
      icon="procurement"
      hue="green"
      category="Business"
      meta={`${orders.length} order${orders.length === 1 ? '' : 's'}`}
      status={copied ? 'CSV copied' : undefined}
      side={
        <Rail
          title="Totals"
          note={orders.length > 0 ? `${orders.length} order${orders.length === 1 ? '' : 's'} on file` : 'Nothing on file yet'}
          chips={[
            `${visibleRows.length} line${visibleRows.length === 1 ? '' : 's'}`,
            `Booked ${formatUsd(grandTotal)}`,
            'Sort by total',
            'CSV export',
          ]}
        />
      }
    >
      <Stack lg>
        <Card
          title="Orders"
          mono={`${orders.length} saved`}
          actions={
            <Spread style={{ gap: 8, maxWidth: 420, width: '100%' }}>
              <TextInput
                label="Search"
                value={search}
                onChange={setSearch}
                type="search"
                placeholder="Filter by vendor"
              />
              <Button kind="secondary" onClick={exportCsv} disabled={orders.length === 0}>
                Export CSV
              </Button>
              <Button
                kind="primary"
                onClick={() => {
                  setVendor('')
                  setOrderDate('')
                  setLines([])
                }}
              >
                New order
              </Button>
            </Spread>
          }
        >
          {orders.length > 0 && (
            <KpiRow>
              <Kpi value={formatUsd(grandTotal)} label="Booked total" accent />
              <Kpi value={String(orders.length)} label="Orders" />
            </KpiRow>
          )}
          <Table
            label="Purchase orders"
            columns={columns}
            rows={visibleRows.map((r) => ({ cells: r as Record<string, string> }))}
            empty="No purchase orders yet"
          />
        </Card>

        <Card title="New purchase order" mono="Vendor and line items">
            <Stack>
              <FormGrid>
                <TextInput label="Vendor" value={vendor} onChange={setVendor} placeholder="Acme Corp" />
                <TextInput label="Order date" value={orderDate} onChange={setOrderDate} type="date" />
              </FormGrid>

              <Divider />

              <Stack>
                <Spread>
                  <strong>Line items</strong>
                  <Button kind="secondary" onClick={addLine}>
                    Add line item
                  </Button>
                </Spread>

                {lines.length === 0 ? (
                  <EmptyState
                    title="No line items yet"
                    detail="Add a line item with a description, quantity, and unit price."
                    actionLabel="Add first line item"
                    onAction={addLine}
                  />
                ) : (
                  <Stack>
                    {lines.map((line, idx) => (
                      <Card key={line.key} flush>
                        <FormGrid>
                          <TextInput
                            label="Description"
                            value={line.description}
                            onChange={(v) => updateLine(line.key, { description: v })}
                            placeholder="Widget"
                          />
                          <TextInput
                            label="Quantity"
                            value={line.quantity}
                            onChange={(v) => updateLine(line.key, { quantity: v })}
                            type="number"
                            inputMode="numeric"
                            placeholder="10"
                          />
                          <TextInput
                            label="Unit price"
                            value={line.unitPrice}
                            onChange={(v) => updateLine(line.key, { unitPrice: v })}
                            type="number"
                            inputMode="decimal"
                            placeholder="25.00"
                          />
                          <TextInput
                            label="Discount %"
                            value={line.discountPct}
                            onChange={(v) => updateLine(line.key, { discountPct: v })}
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                          />
                          <TextInput
                            label="Tax %"
                            value={line.taxPct}
                            onChange={(v) => updateLine(line.key, { taxPct: v })}
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                          />
                        </FormGrid>
                        {formResults[idx] && (
                          <KpiRow>
                            <Kpi value={formatUsd(formResults[idx].total)} label="Line total" accent />
                          </KpiRow>
                        )}
                      </Card>
                    ))}
                  </Stack>
                )}
              </Stack>

              <Divider />

              <Spread style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <KpiRow>
                  <Kpi
                    value={formatUsd(formResults.reduce((sum, r) => sum + r.total, 0))}
                    label="Order total"
                    accent
                  />
                </KpiRow>
                <Spread style={{ gap: 8 }}>
                  <Button
                    kind="secondary"
                    onClick={() => {
                      setVendor('')
                      setOrderDate('')
                      setLines([])
                    }}
                  >
                    Cancel
                  </Button>
                  <Button kind="primary" onClick={saveOrder} disabled={!canSave}>
                    Save
                  </Button>
                </Spread>
              </Spread>
            </Stack>
          </Card>

        {orders.length > 0 && (
          <Card title="Manage" mono="Delete orders">
            <Stack>
              {filtered.map((o) => (
                <Spread key={o.id} style={{ alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div>{o.vendor}</div>
                    <div style={{ color: 'var(--ink-60)', fontSize: 13 }}>
                      {o.orderDate} · {o.lineItems.length} item{o.lineItems.length === 1 ? '' : 's'} ·{' '}
                      {formatUsd(orderTotalMinor(o))}
                    </div>
                  </div>
                  <Button kind="danger" onClick={() => deleteOrder(o.id)}>
                    Delete {o.vendor}
                  </Button>
                </Spread>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
