// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Actions,
  Body,
  Button,
  Card,
  Divider,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  Stack,
  Table,
  TextInput,
} from '@lacuna/ui'
import { toCsv } from '@lacuna/csv-parse'
import { useClipboard } from '@lacuna/use-clipboard'
import { computeLineItem, computeOrderTotals, formatMinorUnits } from '@lacuna/line-items'
import { exportBackup, importBackup } from '@lacuna/json-backup'
import { orderStore, type OrderRecord, type LineItemRecord } from './host'

const CURRENCY = 'USD'
const BACKUP_VERSION = 1

interface DraftLine {
  description: string
  quantity: string
  unitPrice: string
  discount: string
  taxRate: string
}

const EMPTY_DRAFT: DraftLine = { description: '', quantity: '', unitPrice: '', discount: '', taxRate: '' }

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function orderTotals(order: OrderRecord): number {
  return computeOrderTotals(
    order.lineItems.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discount: l.discountPct / 100,
      taxRate: l.taxPct / 100,
    })),
  ).grandTotal
}

function parsePct(raw: string): number {
  const value = parseFloat(raw)
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function draftToLine(draft: DraftLine, index: number): LineItemRecord | null {
  const quantity = Math.max(1, Math.round(Number(draft.quantity) || 0))
  const unitPrice = Math.round((parseFloat(draft.unitPrice) || 0) * 100)
  if (!draft.description.trim() || unitPrice <= 0) return null
  return {
    id: `li-${index}-${Math.random().toString(36).slice(2, 8)}`,
    description: draft.description.trim(),
    quantity,
    unitPrice,
    discountPct: parsePct(draft.discount),
    taxPct: parsePct(draft.taxRate),
  }
}

export function App() {
  const { copy } = useClipboard()
  const [orders, setOrders] = useState<OrderRecord[]>(() => orderStore.list())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setOrders(orderStore.list())
  }, [])
  const [vendor, setVendor] = useState('')
  const [orderDate, setOrderDate] = useState(today())
  const [lines, setLines] = useState<DraftLine[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: 'date' | 'total'; dir: 'asc' | 'desc' } | null>(null)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const importFileRef = useRef<HTMLInputElement | null>(null)

  const selected = useMemo(() => orders.find((o) => o.id === selectedId) ?? null, [orders, selectedId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q ? orders.filter((o) => o.vendor.toLowerCase().includes(q)) : [...orders]
    if (!sort) return list
    return list.sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1
      if (sort.key === 'total') {
        const cmp = orderTotals(a) - orderTotals(b)
        if (cmp !== 0) return cmp * dir
        return a.id.localeCompare(b.id) * dir
      }
      const cmp = a.orderDate.localeCompare(b.orderDate)
      if (cmp !== 0) return cmp * dir
      return a.id.localeCompare(b.id) * dir
    })
  }, [orders, query, sort])

  const totals = useMemo(
    () =>
      computeOrderTotals(
        visible.flatMap((o) =>
          o.lineItems.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discount: l.discountPct / 100,
            taxRate: l.taxPct / 100,
          })),
        ),
      ),
    [visible],
  )

  function openForm() {
    setVendor('')
    setOrderDate(today())
    setLines([])
    setFormError(null)
  }

  function closeForm() {
    setFormError(null)
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_DRAFT }])
  }

  function setLine(i: number, patch: Partial<DraftLine>) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))
  }

  function removeLine(i: number) {
    setLines((prev) => prev.filter((_, idx) => idx !== i))
  }

  function save() {
    const v = vendor.trim()
    if (!v) {
      setFormError('Vendor is required')
      return
    }
    const parsed = lines.map((l, i) => draftToLine(l, i)).filter((l): l is LineItemRecord => l !== null)
    const date = /^\d{4}-\d{2}-\d{2}$/.test(orderDate) ? orderDate : today()
    orderStore.add({ vendor: v, orderDate: date, lineItems: parsed })
    setOrders(orderStore.list())
    setSelectedId(null)
    setVendor('')
    setOrderDate(today())
    setLines([])
    setFormError(null)
  }

  function toggleSort(key: 'date' | 'total') {
    const active = sort?.key === key
    setSort(active ? { key, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  function openOrder(id: string) {
    setSelectedId(id)
  }

  function exportCsv() {
    const rows: string[][] = visible.flatMap((o) =>
      o.lineItems.map((l) => [
        o.vendor,
        o.orderDate,
        l.description,
        String(l.quantity),
        (l.unitPrice / 100).toFixed(2),
        String(l.discountPct),
        String(l.taxPct),
        (computeLineItem({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discountPct / 100,
          taxRate: l.taxPct / 100,
        }).total / 100).toFixed(2),
      ]),
    )
    void copy(toCsv([['vendor', 'order_date', 'description', 'quantity', 'unit_price', 'discount_pct', 'tax_pct', 'total'], ...rows]))
  }

  interface BackupOrder {
    vendor: string
    orderDate: string
    lineItems: Array<{
      description: string
      quantity: number
      unitPrice: number
      discountPct: number
      taxPct: number
    }>
  }

  function backupText(): string {
    return exportBackup({
      appId: 'purchase-order',
      version: BACKUP_VERSION,
      filename: 'purchase-order',
      records: orders.map((o) => ({
        id: o.id,
        data: {
          vendor: o.vendor,
          orderDate: o.orderDate,
          lineItems: o.lineItems.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            taxPct: l.taxPct,
          })),
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })),
    })
  }

  function applyMerged(list: OrderRecord[]) {
    const byId = new Map(list.map((record) => [record.id, record]))
    for (const existing of orders) {
      const incoming = byId.get(existing.id)
      if (!incoming) orderStore.remove(existing.id)
      else if (incoming.lineItems.length === 0) orderStore.remove(existing.id)
      else orderStore.update(existing.id, incoming)
    }
    const existingIds = new Set(orders.map((o) => o.id))
    for (const record of list) {
      if (!existingIds.has(record.id) && record.lineItems.length > 0) {
        orderStore.add({ id: record.id, vendor: record.vendor, orderDate: record.orderDate, lineItems: record.lineItems })
      }
    }
    setOrders(orderStore.list())
  }

  async function exportBackupFile() {
    const json = backupText()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'purchase-order-backup.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function onPickImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportText(await file.text())
  }

  function applyImport() {
    setImportMsg(null)
    if (!importText.trim()) {
      setImportMsg('Paste a backup, or choose a .json file first.')
      return
    }
    try {
      const result = importBackup<BackupOrder>(importText, {
        currentVersion: BACKUP_VERSION,
        validate: (record) => {
          const d = record.data
          if (typeof d?.vendor !== 'string' || !d.vendor.trim()) return 'missing vendor'
          if (typeof d?.orderDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.orderDate)) return 'missing valid date'
          if (!Array.isArray(d?.lineItems) || d.lineItems.length === 0) return 'no lines'
          for (const l of d.lineItems) {
            if (typeof l?.description !== 'string' || !l.description.trim()) return 'line missing description'
            if (typeof l?.quantity !== 'number' || l.quantity < 1) return 'line with bad quantity'
            if (typeof l?.unitPrice !== 'number' || l.unitPrice < 0) return 'line with bad unit price'
          }
          return null
        },
      })
      const seen = new Set(orders.map((o) => o.id))
      let added = 0
      let updated = 0
      const next = [...orders]
      for (const record of result.records) {
        const lineItems = record.data.lineItems.map((l) => ({
          id: '',
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPct: typeof l.discountPct === 'number' ? l.discountPct : 0,
          taxPct: typeof l.taxPct === 'number' ? l.taxPct : 0,
        }))
        const incoming: OrderRecord = { id: record.id, vendor: record.data.vendor, orderDate: record.data.orderDate, lineItems }
        if (seen.has(record.id)) {
          const idx = next.findIndex((o) => o.id === record.id)
          if (idx >= 0) next[idx] = incoming
          updated += 1
        } else {
          next.push(incoming)
          seen.add(record.id)
          added += 1
        }
      }
      applyMerged(next)
      setImportText('')
      setImportMsg(
        result.droppedCount > 0
          ? `Imported ${added} new, updated ${updated}; ${result.droppedCount} invalid ${result.droppedCount === 1 ? 'record was' : 'records were'} dropped.`
          : `Imported ${added} new, updated ${updated}.`,
      )
    } catch (err) {
      setImportMsg(err instanceof Error ? `Could not import: ${err.message}` : 'Could not import that text.')
    }
  }

  const draftTotal = lines.reduce((sum, l, i) => {
    const line = draftToLine(l, i)
    if (!line) return sum
    return sum + computeLineItem({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount: line.discountPct / 100,
      taxRate: line.taxPct / 100,
    }).total
  }, 0)

  const draftLines = lines.map((l, i) => draftToLine(l, i)).filter((l): l is LineItemRecord => l !== null)

  const detailTotals = selected
    ? computeOrderTotals(
        selected.lineItems.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discount: l.discountPct / 100,
          taxRate: l.taxPct / 100,
        })),
      )
    : null

  return (
    <AppShell
      name="Purchase Order"
      icon="procurement"
      hue="green"
      category="Procurement"
      meta={`${orders.length} ${orders.length === 1 ? 'order' : 'orders'}`}
      status={
        orders.length > 0
          ? `${visible.length} ${visible.length === 1 ? 'order' : 'orders'} · ${formatMinorUnits(totals.grandTotal, CURRENCY)} total`
          : 'No orders yet'
      }
    >
      <Stack>
        <KpiRow>
          <Kpi value={visible.length} label="Orders" />
          <Kpi value={visible.flatMap((o) => o.lineItems).length} label="Line items" />
          <Kpi value={formatMinorUnits(totals.grandTotal, CURRENCY)} label="Grand total" accent />
        </KpiRow>

        {selected && detailTotals ? (
          <Card mono="Order detail"             actions={<Button kind="ghost" onClick={() => setSelectedId(null)}>Back to orders</Button>} title={selected.vendor}>
            <MonoLabel>Date</MonoLabel>
            <Body>{selected.orderDate}</Body>
            <Divider />
            <Table
              label="Lines"
              columns={[
                { key: 'description', label: 'Description' },
                { key: 'quantity', label: 'Quantity', num: true },
                { key: 'unitPrice', label: 'Unit price', num: true },
                { key: 'discount', label: 'Discount %', num: true },
                { key: 'taxRate', label: 'Tax %', num: true },
                { key: 'total', label: 'Amount', num: true },
              ]}
              rows={selected.lineItems.map((l) => {
                const r = computeLineItem({
                  description: l.description,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                  discount: l.discountPct / 100,
                  taxRate: l.taxPct / 100,
                })
                return {
                  cells: {
                    description: l.description,
                    quantity: String(l.quantity),
                    unitPrice: formatMinorUnits(l.unitPrice, CURRENCY),
                    discount: String(l.discountPct),
                    taxRate: String(l.taxPct),
                    total: <div data-label="Amount">{formatMinorUnits(r.total, CURRENCY)}</div>,
                  },
                }
              })}
              foot={{
                description: 'Totals',
                quantity: '',
                unitPrice: '',
                discount: `Subtotal ${formatMinorUnits(detailTotals.subtotal, CURRENCY)}`,
                taxRate: `Tax ${formatMinorUnits(detailTotals.totalTax, CURRENCY)}`,
                total: formatMinorUnits(detailTotals.grandTotal, CURRENCY),
              }}
            />
            <KpiRow>
              <Kpi value={formatMinorUnits(detailTotals.subtotal, CURRENCY)} label="Subtotal" />
              <Kpi value={formatMinorUnits(detailTotals.totalDiscount, CURRENCY)} label="Discounts" />
              <Kpi value={formatMinorUnits(detailTotals.totalTax, CURRENCY)} label="Tax" />
              <Kpi value={formatMinorUnits(detailTotals.grandTotal, CURRENCY)} label="Grand total" accent />
            </KpiRow>
          </Card>
        ) : null}

          <Card mono="New order" title="New purchase order">
              {formError ? <MonoLabel style={{ color: 'var(--danger)' }}>{formError}</MonoLabel> : null}
              <FormGrid>
                <TextInput label="Vendor" value={vendor} onChange={setVendor} />
                <TextInput label="Order date" value={orderDate} onChange={setOrderDate} type="date" />
              </FormGrid>
              <MonoLabel faint={lines.length === 0}>Line items</MonoLabel>
              {lines.length === 0 && <Body sm>Add at least one line item to save this order.</Body>}
              <Table
                label="Line items"
                columns={[
                  { key: 'description', label: 'Description' },
                  { key: 'quantity', label: 'Quantity', num: true },
                  { key: 'unitPrice', label: 'Unit price', num: true },
                  { key: 'discount', label: 'Discount %', num: true },
                  { key: 'taxRate', label: 'Tax %', num: true },
                   { key: 'total', label: 'Amount', num: true },
                  { key: 'actions', label: '' },
                ]}
                rows={lines.map((l, i) => {
                  const parsed = draftToLine(l, i)
                    const total = parsed
                    ? computeLineItem({
                        description: parsed.description,
                        quantity: parsed.quantity,
                        unitPrice: parsed.unitPrice,
                        discount: parsed.discountPct / 100,
                        taxRate: parsed.taxPct / 100,
                      }).total
                    : 0
                  return {
                    cells: {
                      description: (
                        <TextInput label="Description" value={l.description} onChange={(v) => setLine(i, { description: v })} />
                      ),
                      quantity: <TextInput label="Quantity" value={l.quantity} onChange={(v) => setLine(i, { quantity: v })} inputMode="numeric" />,
                      unitPrice: <TextInput label="Unit price" value={l.unitPrice} onChange={(v) => setLine(i, { unitPrice: v })} inputMode="decimal" />,
                      discount: <TextInput label="Discount %" value={l.discount} onChange={(v) => setLine(i, { discount: v })} inputMode="decimal" />,
                      taxRate: <TextInput label="Tax %" value={l.taxRate} onChange={(v) => setLine(i, { taxRate: v })} inputMode="decimal" />,
                      total: <div data-label="Amount">{formatMinorUnits(total, CURRENCY)}</div>,
                      actions: (
                        <Button kind="ghost" ariaLabel={`Remove line ${i + 1}`} onClick={() => removeLine(i)}>Remove</Button>
                      ),
                    },
                  }
                })}
                foot={draftLines.length > 0 ? {
                  description: 'Amount',
                  quantity: String(draftLines.length),
                  unitPrice: '',
                  discount: '',
                  taxRate: '',
                  total: formatMinorUnits(draftTotal, CURRENCY),
                  actions: '',
                } : undefined}
              />
              <Actions>
                <Button onClick={addLine}>Add line item</Button>
                <Button kind="primary" onClick={save}>Save</Button>
                <Button kind="ghost" onClick={closeForm}>Cancel</Button>
              </Actions>
          </Card>

          <Card mono="Search" actions={<Button kind="ghost" onClick={openForm}>New order</Button>} title="Orders">
              <TextInput label="Search" value={query} onChange={setQuery} placeholder="Filter by vendor…" />
              <Table
                label="Purchase orders"
                columns={[
                  { key: 'vendor', label: 'Vendor' },
                   {
                     key: 'date',
                     label: (
                       <button type="button" aria-label="Sort by date" onClick={() => toggleSort('date')} style={{ width: '100%', justifyContent: 'inherit', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}>Date {sort?.key === 'date' ? (sort.dir === 'desc' ? '↓' : '↑') : ''}</button>
                     ),
                   },
                  { key: 'lines', label: 'Lines' },
                   {
                     key: 'total',
                     label: (
                       <button type="button" aria-label="Sort by total" onClick={() => toggleSort('total')} style={{ width: '100%', justifyContent: 'inherit', background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'inherit', letterSpacing: 'inherit' }}>Total {sort?.key === 'total' ? (sort.dir === 'desc' ? '↓' : '↑') : ''}</button>
                     ),
                     num: true,
                   },
                  { key: 'actions', label: '' },
                ]}
                rows={visible.map((o) => ({
                  cells: {
                    vendor: (
                      <>
                        <b>{o.vendor}</b>
                        {o.lineItems.map((l) => (
                          <div key={l.id} data-line={l.id}>
                            {l.description} · {l.quantity} @ {formatMinorUnits(l.unitPrice, CURRENCY)} · {l.discountPct}% off · {l.taxPct}% tax
                          </div>
                        ))}
                      </>
                    ),
                    date: o.orderDate,
                    lines: String(o.lineItems.length),
                    total: <div data-label="Total">{formatMinorUnits(orderTotals(o), CURRENCY)}</div>,
                    actions: (
                      <>
                        <Button kind="ghost" ariaLabel={`View ${o.vendor}`} onClick={() => openOrder(o.id)}>View</Button>
                        <Button kind="ghost" ariaLabel={`Delete ${o.vendor}`} onClick={() => { orderStore.remove(o.id); setOrders(orderStore.list()) }}>Delete {o.vendor}</Button>
                      </>
                    ),
                  },
                }))}
                empty="No purchase orders yet"
              />
          </Card>

          <Card mono="Data" title="Export & import">
            <Body sm>Export the whole book as CSV to the clipboard, or back up and restore as JSON. Importing adds new orders without duplicating existing ones.</Body>
            <Actions>
              <Button kind="ghost" onClick={exportCsv} disabled={visible.length === 0}>Export CSV</Button>
              <Button kind="ghost" onClick={exportBackupFile} disabled={orders.length === 0}>Backup JSON</Button>
              <Button kind="ghost" onClick={() => importFileRef.current?.click()}>Import backup…</Button>
            </Actions>
            <input
              ref={importFileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              aria-hidden
              tabIndex={-1}
              onChange={onPickImportFile}
            />
            <TextInput label="Paste a JSON backup" value={importText} onChange={setImportText} rows={3} placeholder='{"version":1,"appId":"purchase-order",…}' />
            <Actions>
              <Button kind="ghost" onClick={applyImport} disabled={!importText.trim()}>Import</Button>
            </Actions>
            {importMsg && (
              <Body sm style={{ marginTop: 'calc(8px * var(--sf))', color: 'var(--mid)' }}>
                {importMsg}
              </Body>
            )}
          </Card>
      </Stack>
    </AppShell>
  )
}
