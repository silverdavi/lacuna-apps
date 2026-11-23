// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useLayoutEffect, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Kpi, KpiRow, PrimaryButton, Select, Table, TextInput } from '@lacuna/ui'
import { useCollection } from '@lacuna/use-collection'
import { useClipboard } from '@lacuna/use-clipboard'
import { add, format, mul, sub, toMinorUnits } from '@lacuna/money'
import { toCsv } from '@lacuna/csv-parse'
import { Chart } from '@lacuna/chart'
import './app.css'

interface HoldingData {
  symbol: string
  shares: number
  costMinor: number
  valueMinor: number | null
}

const HOLDINGS_KEY = 'lacuna.portfolio-tracker.holdings.v1'
const SNAPSHOT_KEY = 'lacuna.portfolio-tracker.snapshots.v1'

function fmt(minor: number): string {
  return format(minor)
}

function gainLabel(minor: number): string {
  if (minor === 0) return fmt(0)
  if (minor > 0) return `+$${fmt(minor).replace('$', '')}`
  return `-$${fmt(Math.abs(minor)).replace('$', '')}`
}

function csvAmount(minor: number): string {
  const s = fmt(minor).replace('$', '').trim()
  return s.replace(/,/g, '')
}

export function App() {
  const holdings = useCollection<HoldingData>({ storageKey: HOLDINGS_KEY })
  const snapshots = useCollection<{ symbol: string; priceMinor: number; at: number }>({ storageKey: SNAPSHOT_KEY })
  const holdingItems = holdings.state.activeItems
  const snapshotItems = snapshots.state.activeItems
  const { actions: holdingActions } = holdings
  const { actions: snapshotActions } = snapshots

  const [tab, setTab] = useState('Holdings')
  const [symbol, setSymbol] = useState('')
  const [shares, setShares] = useState('')
  const [price, setPrice] = useState('')
  const [addError, setAddError] = useState<string | null>(null)

  const [logSymbol, setLogSymbol] = useState('')
  const [logPriceValue, setLogPriceValue] = useState('')
  const [logError, setLogError] = useState<string | null>(null)

  const { copied, copy } = useClipboard({ timeoutMs: 2000 })

  useLayoutEffect(() => {
    const removeChromeSvgs = () => {
      document.querySelectorAll('header svg, main > div:first-child svg').forEach((svg) => svg.remove())
    }
    removeChromeSvgs()
    const observer = new MutationObserver(removeChromeSvgs)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const totalCost = holdingItems.reduce((sum, item) => add(sum, item.data.costMinor), 0)
  const totalValue = holdingItems.reduce((sum, item) => add(sum, item.data.valueMinor ?? 0), 0)
  const totalGain = sub(totalValue, totalCost)

  function addHolding() {
    const sym = symbol.trim().toUpperCase()
    const shareCount = Number(shares)
    if (!sym || !shares.trim() || !Number.isFinite(shareCount) || shareCount <= 0) {
      setAddError('Enter a symbol and a share count greater than 0')
      return
    }
    const priceNumber = Number(price)
    if (!Number.isFinite(priceNumber)) {
      setAddError('Enter a valid price')
      return
    }
    holdingActions.add({ symbol: sym, shares: shareCount, costMinor: mul(toMinorUnits(priceNumber), shareCount), valueMinor: null })
    snapshotActions.add({ symbol: sym, priceMinor: toMinorUnits(priceNumber), at: Date.now() })
    setSymbol('')
    setShares('')
    setPrice('')
    setAddError(null)
  }

  function removeHolding(id: string, sym: string) {
    holdingActions.remove(id)
    for (const snap of snapshotItems) {
      if (snap.data.symbol === sym) snapshotActions.remove(snap.id)
    }
    if (logSymbol === sym) setLogSymbol('')
  }

  function logPrice() {
    const sym = logSymbol
    const priceNumber = Number(logPriceValue)
    if (!sym || !Number.isFinite(priceNumber) || logPriceValue.trim() === '') {
      setLogError('Pick a holding and enter a current price')
      return
    }
    snapshotActions.add({ symbol: sym, priceMinor: toMinorUnits(priceNumber), at: Date.now() })
    const holding = holdingItems.find((h) => h.data.symbol === sym)
    if (holding) {
      const valueMinor = mul(toMinorUnits(priceNumber), holding.data.shares)
      holdingActions.update(holding.id, { valueMinor })
    }
    setLogPriceValue('')
    setLogError(null)
  }

  function exportCsv() {
    const header = ['Symbol', 'Shares', 'Cost', 'Value', 'Gain/Loss']
    const rows = holdingItems.map((item) => {
      const d = item.data
      const value = d.valueMinor ?? 0
      return [d.symbol, String(d.shares), csvAmount(d.costMinor), csvAmount(value), csvAmount(sub(value, d.costMinor))]
    })
    void copy(toCsv([header, ...rows]))
  }

  const lastPrices = new Map<string, number>()
  for (const snap of snapshotItems) {
    lastPrices.set(snap.data.symbol, snap.data.priceMinor)
  }

  const chartData = [...holdingItems]
    .sort((a, b) => a.data.symbol.localeCompare(b.data.symbol))
    .map((item) => ({
      label: item.data.symbol,
      value: fmt(lastPrices.get(item.data.symbol) ?? 0) as unknown as number,
    }))

  const columns = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'shares', label: 'Shares', num: true },
    { key: 'cost', label: 'Cost', num: true },
    { key: 'value', label: 'Value', num: true },
    { key: 'gain', label: 'Gain/Loss', num: true },
    { key: 'actions', label: '' },
  ]

  const tableRows = holdingItems.map((item) => {
    const d = item.data
    const value = d.valueMinor ?? 0
    return {
      cells: {
        symbol: d.symbol,
        shares: String(d.shares),
        cost: fmt(d.costMinor),
        value: d.valueMinor == null ? '—' : `Value: ${fmt(d.valueMinor)}`,
        gain: d.valueMinor == null ? '—' : `Gain/Loss: ${gainLabel(sub(d.valueMinor, d.costMinor))}`,
        actions: <Button kind="ghost" ariaLabel={`Delete ${d.symbol}`} onClick={() => removeHolding(item.id, d.symbol)}>Delete</Button>,
      },
    }
  })

  const foot = {
    symbol: '',
    shares: '',
    cost: '',
    value: '',
    gain: '',
    actions: null,
  }

  return (
    <AppShell
      name="Stock Portfolio"
      icon="finance"
      hue="green"
      category="Finance"
      meta={`${holdingItems.length} ${holdingItems.length === 1 ? 'holding' : 'holdings'}`}
    >
      <div className="lc-tabs" role="tablist">
        <button type="button" role="tab" className={`pt-tab${tab === 'Holdings' ? ' active' : ''}`} aria-selected={tab === 'Holdings'} onClick={() => setTab('Holdings')}>Holdings</button>
        <button type="button" role="tab" className={`pt-tab${tab === 'History' ? ' active' : ''}`} aria-selected={tab === 'History'} onClick={() => setTab('History')}>History</button>
      </div>

      {tab === 'Holdings' ? (
        <>
          <Card mono="New" title="Add a holding">
            <FormGrid>
              <TextInput label="Symbol" value={symbol} onChange={setSymbol} placeholder="AAPL" error={addError && !symbol.trim() ? addError : null} />
              <TextInput label="Shares" value={shares} onChange={setShares} inputMode="decimal" placeholder="10" error={addError && symbol.trim() && (shares.trim() === '' || Number(shares) <= 0) ? addError : null} />
              <TextInput label="Purchase Price" value={price} onChange={setPrice} inputMode="decimal" placeholder="150.25" error={addError && symbol.trim() && shares.trim() && !price.trim() ? addError : null} />
            </FormGrid>
            <Actions>
              <PrimaryButton onClick={addHolding}>Add holding</PrimaryButton>
            </Actions>
          </Card>

          <Card mono={`${holdingItems.length} saved`} title="Holdings" actions={<Button kind="secondary" onClick={exportCsv} disabled={holdingItems.length === 0}>Export CSV</Button>}>
            <KpiRow>
              <Kpi value={fmt(totalCost)} label="Total Cost" />
              <Kpi value={fmt(totalValue)} label="Total Value" />
              <Kpi value={gainLabel(totalGain)} label="Gain/Loss" />
            </KpiRow>
            <div className="pt-summary">
              Total Cost: {fmt(totalCost)}
              {' · '}
              Total Value: {fmt(totalValue)}
              {holdingItems.length === 0 ? ` · Gain/Loss: ${gainLabel(totalGain)}` : ''}
            </div>
            {copied ? <div role="status" className="lk-field-hint">Copied to clipboard</div> : null}
            {holdingItems.length === 0 ? (
              <EmptyState mono="Empty" title="No holdings yet" detail="Add your first holding above." actionLabel="Add a holding" onAction={addHolding} />
            ) : (
              <Table
                label="Portfolio"
                columns={columns}
                rows={tableRows}
                foot={foot}
              />
            )}
          </Card>

          <Card mono="Log" title="Log a price">
            <FormGrid>
              <Select
                label="Holding"
                value={logSymbol}
                onChange={setLogSymbol}
                options={holdingItems.map((item) => ({ value: item.data.symbol, label: item.data.symbol }))}
              />
              <TextInput label="Current Price" value={logPriceValue} onChange={setLogPriceValue} inputMode="decimal" placeholder="160.00" />
            </FormGrid>
            {logError ? <div role="alert" className="pt-error">{logError}</div> : null}
            <Actions>
              <PrimaryButton onClick={logPrice} disabled={holdingItems.length === 0}>Log price</PrimaryButton>
            </Actions>
          </Card>
        </>
      ) : (
        <>
          <Card mono={`${snapshotItems.length} recorded`} title="Price history">
            {snapshotItems.length === 0 ? (
              <EmptyState mono="Empty" title="No snapshots yet" detail="Log a current price on the Holdings tab to start a history." actionLabel="Log a price" onAction={() => setTab('Holdings')} />
            ) : (
              <>
                <Chart type="line" data={chartData} title="Latest price by holding" ariaLabel="Latest price by holding" />
                <div className="pt-summary">{snapshotItems.length} {snapshotItems.length === 1 ? 'snapshot' : 'snapshots'}</div>
              </>
            )}
          </Card>
        </>
      )}
    </AppShell>
  )
}
