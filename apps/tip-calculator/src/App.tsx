// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Tip calculator: enter the bill and tax, pick a tip percentage, and see the total and per-person share.
// Split the check and see who pays whom. Everything persists locally.
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Button, Card, FormGrid, Stack, Table } from '@lacuna/ui'
import { add, format } from '@lacuna/money'
import { useClipboard } from '@lacuna/use-clipboard'
import { tipStore, type TipRecord } from './host/mock'

const TABS = ['Bill', 'Split'] as const
type Tab = (typeof TABS)[number]

const TIP_PRESETS = [
  { value: '0%', label: '0%' },
  { value: '5%', label: '5%' },
  { value: '10%', label: '10%' },
  { value: '15%', label: '15%' },
  { value: '20%', label: '20%' },
  { value: '25%', label: '25%' },
]

function moneyInputStyle(): React.CSSProperties {
  return {
    font: 'inherit',
    fontSize: 'calc(14px * var(--tf))',
    color: 'var(--ink)',
    background: 'var(--paper)',
    borderWidth: 'calc(1px * var(--sf))',
    borderStyle: 'solid',
    borderColor: 'var(--hair-strong)',
    padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
    minWidth: 'calc(80px * var(--sf))',
    borderRadius: 'calc(6px * var(--sf))',
  }
}

export function App() {
  const [record, setRecord] = useState<TipRecord>(() => tipStore.get())
  const [tab, setTab] = useState<Tab>('Bill')

  useEffect(() => {
    tipStore.set(record)
  }, [record])

  const { bill, tax, tipPercent, people, paid } = record

  const billMinor = bill
  const taxMinor = tax
  const subtotal = billMinor
  const tipMinor = Math.round((billMinor * tipPercent) / 100)
  const total = add(add(subtotal, taxMinor), tipMinor)
  const perPerson = people > 0 ? Math.round(total / people) : 0

  const summaryText = `Total: ${format(total)}, Per person: ${format(perPerson)}`
  const clipboard = useClipboard({ timeoutMs: 1500 })

  function handleCopy() {
    void clipboard.copy(summaryText).catch(() => {
      const ta = document.createElement('textarea')
      ta.value = summaryText
      ta.style.position = 'fixed'
      ta.style.left = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    })
  }

  const peopleList = useMemo(() => {
    const n = Math.max(1, Math.min(20, people))
    return Array.from({ length: n }, (_, i) => i + 1)
  }, [people])

  const splitRows = peopleList.map((i) => {
    const paidMinor = paid[String(i)] ?? 0
    const owes = perPerson - paidMinor
    return {
      cells: {
        person: String(i),
        paid: format(paidMinor),
        owes: format(owes > 0 ? owes : 0),
      },
    }
  })

  const transfers = useMemo(() => {
    const diffList: { person: number; diff: number }[] = []
    for (const i of peopleList) {
      const paidMinor = paid[String(i)] ?? 0
      diffList.push({ person: i, diff: paidMinor - perPerson })
    }
    const lines: string[] = []
    const remaining = [...diffList]
    while (true) {
      let creditorIdx = -1
      let debtorIdx = -1
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].diff > 0) { creditorIdx = i; break }
      }
      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].diff < 0) { debtorIdx = i; break }
      }
      if (creditorIdx === -1 || debtorIdx === -1) break
      const pay = Math.min(remaining[creditorIdx].diff, -remaining[debtorIdx].diff)
      lines.push(`Person ${remaining[debtorIdx].person} pays Person ${remaining[creditorIdx].person} ${format(pay)}`)
      remaining[creditorIdx].diff -= pay
      remaining[debtorIdx].diff += pay
    }
    return lines
  }, [peopleList, paid, perPerson])

  function setBill(v: number): void {
    setRecord((prev) => ({ ...prev, bill: v }))
  }
  function setTax(v: number): void {
    setRecord((prev) => ({ ...prev, tax: v }))
  }
  function setTip(v: number): void {
    setRecord((prev) => ({ ...prev, tipPercent: v }))
  }
  function setPeople(v: number | null): void {
    setRecord((prev) => ({ ...prev, people: v ?? prev.people }))
  }
  function setPaid(person: number, v: number): void {
    setRecord((prev) => ({ ...prev, paid: { ...prev.paid, [String(person)]: v } }))
  }
  function setPreset(v: string): void {
    setTip(Number(v.replace('%', '')))
  }

  function parseMoney(text: string): number {
    const cleaned = text.replace(/[^0-9.]/g, '')
    const n = Number(cleaned)
    return Number.isFinite(n) ? Math.round(n * 100) : 0
  }

  function moneyDisplay(minor: number): string {
    return minor === 0 ? '' : String(Math.round(minor) / 100)
  }

  return (
    <AppShell
      name="Tip Calculator"
      icon="invoice"
      hue="teal"
      category="Productivity"
      meta={`${people} people · ${tipPercent}% tip`}
      status="Local · saved on this device"
      actions={
        <Button kind="secondary" onClick={handleCopy}>
          {clipboard.copied ? 'Copied' : 'Copy summary'}
        </Button>
      }
    >
      <Stack>
        <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(13px * var(--tf))',
                color: tab === t ? 'var(--paper)' : 'var(--ink)',
                background: tab === t ? 'var(--ink)' : 'transparent',
                border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
                borderRadius: 'calc(7px * var(--sf))',
                padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Bill' ? (
          <>
            <Card mono="Input" title="Bill">
              <FormGrid>
                <label className="lc-field">
                  <span className="lc-field-label">Bill amount</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Bill amount"
                    value={moneyDisplay(billMinor)}
                    onChange={(e) => setBill(parseMoney(e.target.value))}
                    style={moneyInputStyle()}
                  />
                </label>
                <label className="lc-field">
                  <span className="lc-field-label">Tax amount</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    aria-label="Tax amount"
                    value={moneyDisplay(taxMinor)}
                    onChange={(e) => setTax(parseMoney(e.target.value))}
                    style={moneyInputStyle()}
                  />
                </label>
                <label className="lc-field">
                  <span className="lc-field-label">Number of people</span>
                  <input
                    type="number"
                    aria-label="Number of people"
                    value={people}
                    min={1}
                    max={50}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setPeople(Number.isFinite(v) && v > 0 ? Math.round(v) : null)
                    }}
                    style={moneyInputStyle()}
                  />
                </label>
              </FormGrid>
              <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                <label className="lc-field">
                  <span className="lc-field-label">Tip percentage</span>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={tipPercent}
                    aria-label="Tip percentage"
                    aria-valuenow={tipPercent}
                    onChange={(e) => setTip(Number(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </label>
              </div>
              <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                <div className="lc-field">
                  <span className="lc-field-label" id="tip-preset-label">Tip preset</span>
                  <select
                    className="lc-input"
                    aria-labelledby="tip-preset-label"
                    value={`${tipPercent}%`}
                    onChange={(e) => setPreset(e.target.value)}
                    style={moneyInputStyle()}
                  >
                    {TIP_PRESETS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </Card>

            <Card mono="Result" title="Summary">
              <div className="lc-body">
                <div>Subtotal: {format(subtotal)}</div>
                <div>Tax: {format(taxMinor)}</div>
                <div>Tip: {format(tipMinor)}</div>
                <div>Total: {format(total)}</div>
                <div>Per person: {format(perPerson)}</div>
              </div>
            </Card>
          </>
        ) : (
          <>
            <Card mono={`${peopleList.length} people`} title="Payments">
              <FormGrid>
                {peopleList.map((i) => (
                  <label key={i} className="lc-field">
                    <span className="lc-field-label">Person {i} paid</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      aria-label={`Person ${i} paid`}
                      value={moneyDisplay(paid[String(i)] ?? 0)}
                      onChange={(e) => setPaid(i, parseMoney(e.target.value))}
                      style={moneyInputStyle()}
                    />
                  </label>
                ))}
              </FormGrid>
            </Card>

            <Card mono="Detail" title="Who pays whom">
              <Table
                label="Split"
                columns={[
                  { key: 'person', label: 'Person' },
                  { key: 'paid', label: 'Paid', num: true },
                  { key: 'owes', label: 'Owes', num: true },
                ]}
                rows={splitRows}
              />
              {transfers.length > 0 && (
                <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                  {transfers.map((line, i) => (
                    <div key={i} className="lc-body-sm">{line}</div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </Stack>
    </AppShell>
  )
}
