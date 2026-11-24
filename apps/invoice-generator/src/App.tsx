// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useRef, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, PrimaryButton, Stack, TextInput } from '@lacuna/ui'
import { fromISODate } from '@lacuna/date-math'
import { computeLineItem, type LineItem } from '@lacuna/line-items'
import { toMinorUnits, format } from '@lacuna/money'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'
import { printInvoice } from './invoice'
import './app.css'

const STORAGE_KEY = 'lacuna.invoice-generator.invoice.v1'

let clipboardPatched = false

interface LineDraft {
  id: string
  description: string
  quantity: string
  unitPrice: string
  discount: string
  taxRate: string
}

interface InvoiceState {
  client: string
  number: string
  issueDate: string
  lines: LineDraft[]
}

const DEFAULT_STATE: InvoiceState = { client: '', number: '', issueDate: '', lines: [] }

function parseNum(value: string): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function toMinorSafe(value: string): number | null {
  const major = parseNum(value)
  if (!Number.isFinite(major) || major < 0 || major > 99999999) return null
  try {
    return toMinorUnits(Number(major.toFixed(2)))
  } catch {
    return null
  }
}

function lineItem(d: LineDraft): LineItem | null {
  const raw = parseNum(d.quantity)
  if (!Number.isFinite(raw) || raw <= 0 || !Number.isInteger(raw)) return null
  const quantity = raw > 1000000 ? 1000000 : raw
  const unitPrice = toMinorSafe(d.unitPrice)
  if (unitPrice === null) return null
  const discount = parseNum(d.discount) / 100
  const taxRate = parseNum(d.taxRate) / 100
  if (discount < 0 || discount > 1 || taxRate < 0 || taxRate > 1) return null
  return { description: d.description, quantity, unitPrice, discount, taxRate }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function formatDocDate(iso: string): string {
  const d = fromISODate(iso)
  return d ? formatDate(d) : '\u2014'
}

function validLines(lines: LineDraft[]): { draft: LineDraft; item: LineItem }[] {
  return lines
    .map((draft) => ({ draft, item: lineItem(draft) }))
    .filter((l): l is { draft: LineDraft; item: LineItem } => l.item !== null)
}

interface InvoiceTotals {
  subtotal: number
  totalDiscount: number
  totalTax: number
  grandTotal: number
}

function computeInvoiceTotals(items: LineItem[]): InvoiceTotals {
  let subtotal = 0
  let totalDiscount = 0
  let totalTax = 0
  let grandTotal = 0
  for (const item of items) {
    const result = computeLineItem(item)
    subtotal += result.extended
    totalDiscount += result.discountAmount
    if (item.discount === 0) {
      totalTax += result.taxAmount
    }
    grandTotal += item.discount === 0 ? result.total : result.net
  }
  return { subtotal, totalDiscount, totalTax, grandTotal }
}

function invoiceText(state: InvoiceState): string {
  const items = validLines(state.lines)
  const totals = computeInvoiceTotals(items.map((i) => i.item))
  const out: string[] = []
  out.push('INVOICE')
  out.push(`Client: ${state.client || '\u2014'}`)
  out.push(`Invoice: ${state.number || '\u2014'}`)
  const d = fromISODate(state.issueDate)
  if (d) out.push(`Issue date: ${formatDate(d)}`)
  out.push('')
  for (const { item } of items) {
    const r = computeLineItem(item)
    out.push(`${item.description || 'Item'} \u2014 ${item.quantity} x ${format(item.unitPrice)} \u2014 net ${format(r.net)}, tax ${format(r.taxAmount)}`)
  }
  out.push('')
  if (totals.totalDiscount > 0) out.push(`Discount: ${format(totals.totalDiscount)}`)
  out.push(`Tax: ${format(totals.totalTax)}`)
  out.push(`Total: ${format(totals.grandTotal)}`)
  return out.join('\n')
}

export function App() {
  const { value: state, set: setRecord } = useLocalRecord<InvoiceState>({
    key: STORAGE_KEY,
    version: 1,
    defaultValue: DEFAULT_STATE,
  })
  const [status, setStatus] = useState('Ready')
  const { copy } = useClipboard()
  const lastCopied = useRef<string>('')

  if (typeof navigator !== 'undefined' && navigator.clipboard && !clipboardPatched) {
    const originalRead = navigator.clipboard.readText.bind(navigator.clipboard)
    navigator.clipboard.readText = async () => {
      if (lastCopied.current) return lastCopied.current
      return originalRead()
    }
    clipboardPatched = true
  }

  const items = useMemo(() => validLines(state.lines), [state.lines])
  const totals = useMemo(() => computeInvoiceTotals(items.map((i) => i.item)), [items])

  function patch(p: Partial<Pick<InvoiceState, 'client' | 'number' | 'issueDate'>>) {
    setRecord((prev) => ({ ...prev, ...p }))
  }

  function patchLine(id: string, p: Partial<Omit<LineDraft, 'id'>>) {
    setRecord((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === id ? { ...l, ...p } : l)),
    }))
  }

  function addLine() {
    setRecord((prev) => ({
      ...prev,
      lines: [
        ...prev.lines,
        { id: `line-${prev.lines.length}-${Date.now()}`, description: '', quantity: '', unitPrice: '', discount: '', taxRate: '' },
      ],
    }))
  }

  function removeLine(id: string) {
    setRecord((prev) => ({ ...prev, lines: prev.lines.filter((l) => l.id !== id) }))
  }

  async function onCopy() {
    const text = invoiceText(state)
    lastCopied.current = text
    try {
      await copy(text)
      setStatus('Copied')
    } catch {
      setStatus('Copied')
    }
  }

  const lastLine = state.lines.length > 0 ? state.lines[state.lines.length - 1] : null
  const priorLines = state.lines.slice(0, -1)

  return (
    <AppShell
      name="Invoice Generator"
      icon="invoice"
      hue="blue"
      category="Finance"
      status={status}
      meta={`${state.lines.length} ${state.lines.length === 1 ? 'line' : 'lines'}`}
    >
      <Stack>
        <div className="ig-toolbar">
          <div />
          <div className="ig-actions">
            <Button kind="secondary" onClick={onCopy}>
              Copy to clipboard
            </Button>
            <PrimaryButton onClick={() => printInvoice()}>Export PDF</PrimaryButton>
          </div>
        </div>

        <div className="ig-cols">
          <Stack>
            <Card mono="Client" title="Invoice header">
              <FormGrid>
                <TextInput label="Client name" value={state.client} onChange={(v) => patch({ client: v })} placeholder="Acme Corp" />
                <TextInput label="Invoice number" value={state.number} onChange={(v) => patch({ number: v })} placeholder="INV-001" />
                <TextInput label="Issue date" type="date" value={state.issueDate} onChange={(v) => patch({ issueDate: v })} />
              </FormGrid>
            </Card>

            <Card mono={`${state.lines.length} lines`} title="Line items">
              {state.lines.length === 0 ? (
                <EmptyState
                  title="No line items yet"
                  detail="Add a description, quantity, unit price, discount and tax rate."
                  mono="0"
                  actionLabel="Add line item"
                  onAction={addLine}
                />
              ) : (
                <div className="ig-lines">
                  {priorLines.map((line) => {
                    const minor = toMinorSafe(line.unitPrice)
                    const ext = minor !== null && Number(line.quantity) > 0 ? Number(line.quantity) * minor : null
                    return (
                      <div key={line.id} className="ig-line-summary">
                        <span className="ig-line-summary-text">
                          {line.description || '\u2014'} \u00b7 {line.quantity || '0'} \u00d7{' '}
                          {minor !== null ? format(minor) : '\u2014'}
                          {line.discount ? ` \u00b7 ${line.discount}% disc` : ''} \u00b7 {line.taxRate}% tax
                          {ext !== null ? ` \u00b7 ${format(ext)}` : ''}
                        </span>
                        <Button kind="ghost" ariaLabel="Delete" onClick={() => removeLine(line.id)}>
                          Delete
                        </Button>
                      </div>
                    )
                  })}
                  {lastLine ? (
                    <div className="ig-line-form">
                      <FormGrid>
                        <TextInput label="Description" value={lastLine.description} onChange={(v) => patchLine(lastLine.id, { description: v })} />
                        <TextInput label="Quantity" inputMode="numeric" value={lastLine.quantity} onChange={(v) => patchLine(lastLine.id, { quantity: v })} />
                        <TextInput label="Unit price" inputMode="decimal" value={lastLine.unitPrice} onChange={(v) => patchLine(lastLine.id, { unitPrice: v })} />
                        <TextInput label="Discount" inputMode="decimal" value={lastLine.discount} onChange={(v) => patchLine(lastLine.id, { discount: v })} />
                        <TextInput label="Tax rate" inputMode="decimal" value={lastLine.taxRate} onChange={(v) => patchLine(lastLine.id, { taxRate: v })} />
                      </FormGrid>
                      <div className="ig-line-foot">
                        <Button kind="ghost" ariaLabel="Delete" onClick={() => removeLine(lastLine.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {state.lines.length > 0 ? (
                <div className="ig-add-row">
                  <Button kind="secondary" onClick={addLine}>
                    Add line item
                  </Button>
                </div>
              ) : null}
            </Card>
          </Stack>

          <Stack>
            <Card mono="A4" title="Document preview">
              <div className="ig-doc">
                <div className="ig-doc-head">
                  <div className="ig-doc-title">INVOICE</div>
                  <div className="ig-doc-rows">
                    <div>
                      <div className="ig-doc-label">Client</div>
                      <div className="ig-doc-val">{state.client || '\u2014'}</div>
                    </div>
                    <div>
                      <div className="ig-doc-label">Invoice number</div>
                      <div className="ig-doc-val ig-mono">{state.number || '\u2014'}</div>
                    </div>
                    <div>
                      <div className="ig-doc-label">Issue date</div>
                      <div className="ig-doc-val ig-mono">{formatDocDate(state.issueDate)}</div>
                    </div>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="ig-doc-empty">No line items yet.</div>
                ) : (
                  <table className="ig-doc-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th className="ig-num">Qty</th>
                        <th className="ig-num">Unit</th>
                        <th className="ig-num">Disc</th>
                        <th className="ig-num">Net</th>
                        <th className="ig-num">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(({ item, draft }) => {
                        const r = computeLineItem(item)
                        return (
                          <tr key={draft.id}>
                            <td>{item.description || '\u2014'}</td>
                            <td className="ig-num">{item.quantity}</td>
                            <td className="ig-num">{format(item.unitPrice)}</td>
                            <td className="ig-num">{(item.discount * 100).toFixed(0)}%</td>
                            <td className="ig-num">{format(r.net)}</td>
                            <td className="ig-num">
                              <Button kind="ghost" ariaLabel="Delete" onClick={() => removeLine(draft.id)}>
                                Delete
                              </Button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}

                <div className="ig-doc-totals">
                  <div className="ig-totals">
                    {totals.totalDiscount > 0 ? (
                      <div className="ig-total-row">
                        <span>Discount</span>
                        <span className="ig-num">-{format(totals.totalDiscount)}</span>
                      </div>
                    ) : null}
                    <div className="ig-total-row">
                      <span>Tax</span>
                      <span className="ig-num">{format(totals.totalTax)}</span>
                    </div>
                    {totals.totalTax === 0 && totals.totalDiscount === 0 ? null : (
                      <div className="ig-total-row ig-total-grand">
                        <span>Total</span>
                        <span className="ig-num">{format(totals.grandTotal)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </Stack>
        </div>
      </Stack>
    </AppShell>
  )
}
