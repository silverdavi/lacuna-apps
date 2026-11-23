// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Net Worth Tracker: add assets and liabilities, watch net worth update live,
// browse a per-category breakdown, export the ledger as CSV.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  KpiRow,
  Kpi,
  List,
  Row,
  Select,
  TextInput,
} from '@lacuna/ui'
import { formatMoney, toCsv, useEntries, type EntryData, type EntryKind } from './host'

const ASSET_CATEGORIES: string[] = [
  'Real Estate',
  'Vehicle',
  'Investments',
  'Cash & Savings',
  'Other',
]
const LIABILITY_CATEGORIES: string[] = [
  'Mortgage',
  'Vehicle',
  'Car Loan',
  'Student Loan',
  'Credit Card',
  'Other',
]

const PALETTE = [
  'var(--geo-cobalt)',
  'var(--geo-gold)',
  'var(--geo-verm)',
  'var(--geo-green)',
  'var(--geo-teal)',
  'var(--geo-legal)',
]

type BreakdownSlice = { label: string; value: number }

function computeBreakdown(items: Array<EntryData>): BreakdownSlice[] {
  const totals = new Map<string, number>()
  for (const item of items) {
    totals.set(item.category, (totals.get(item.category) ?? 0) + item.value)
  }
  return Array.from(totals.entries())
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value }))
}

function DonutChart({ slices }: { slices: BreakdownSlice[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const total = slices.reduce((sum, s) => sum + s.value, 0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const size = 220
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx || total === 0) return
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, size, size)

    const cx = size / 2
    const cy = size / 2
    const outer = size / 2 - 4
    const inner = outer * 0.58
    let angle = -Math.PI / 2

    slices.forEach((slice, index) => {
      const fraction = slice.value / total
      const sweep = fraction * Math.PI * 2
      const color = PALETTE[index % PALETTE.length]
      ctx.beginPath()
      ctx.moveTo(cx + outer * Math.cos(angle), cy + outer * Math.sin(angle))
      ctx.arc(cx, cy, outer, angle, angle + sweep)
      ctx.lineTo(cx + inner * Math.cos(angle + sweep), cy + inner * Math.sin(angle + sweep))
      ctx.arc(cx, cy, inner, angle + sweep, angle, true)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      angle += sweep
    })
  }, [slices, total])

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      <canvas
        ref={canvasRef}
        width={220}
        height={220}
        style={{ width: 220, height: 220 }}
        aria-label={`Category breakdown: ${slices.map((s) => `${s.label} ${formatMoney(s.value)}`).join(', ')}`}
        role="img"
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {slices.map((slice, index) => (
          <div key={slice.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 999,
                background: PALETTE[index % PALETTE.length],
                display: 'inline-block',
                flexShrink: 0,
              }}
              aria-hidden
            />
            <span>{slice.label}</span>
            <span style={{ fontFamily: 'var(--mono)' }}>{formatMoney(slice.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function App() {
  const { state, actions } = useEntries()
  const entries = state.activeItems

  const [tab, setTab] = useState<'Entries' | 'Breakdown'>('Entries')
  const [name, setName] = useState('')
  const [kind, setKind] = useState<EntryKind>('asset')
  const [category, setCategory] = useState<string>('Real Estate')
  const [value, setValue] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'name' | 'value'>('value')

  const totalAssets = entries
    .filter((e) => e.data.kind === 'asset')
    .reduce((sum, e) => sum + e.data.value, 0)
  const totalLiabilities = entries
    .filter((e) => e.data.kind === 'liability')
    .reduce((sum, e) => sum + e.data.value, 0)
  const netWorth = totalAssets - totalLiabilities

  const breakdown = useMemo(
    () => computeBreakdown(entries.map((e) => e.data)),
    [entries],
  )

  function handleKindChange(next: string) {
    setKind(next as EntryKind)
    const categories = next === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES
    if (!categories.includes(category)) {
      setCategory(categories[0])
    }
  }

  function addEntry() {
    const trimmedName = name.trim()
    const parsedValue = Number(value)
    if (!trimmedName) {
      setErrorField('name')
      setFormError('Name is required')
      return
    }
    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
      setErrorField('value')
      setFormError('Value must be greater than 0')
      return
    }
    actions.add({
      name: trimmedName,
      kind,
      category,
      value: Math.round(parsedValue * 100) / 100,
    })
    setName('')
    setValue('')
    setFormError(null)
  }

  function exportCsv() {
    const rows = entries.map((e) => ({
      name: e.data.name,
      type: e.data.kind === 'asset' ? 'Asset' : 'Liability',
      category: e.data.category,
      value: e.data.value,
    }))
    const csv = toCsv(rows)
    navigator.clipboard.writeText(csv).catch(() => {
      setFormError('Could not copy CSV to clipboard')
    })
  }

  const categories = kind === 'asset' ? ASSET_CATEGORIES : LIABILITY_CATEGORIES

  return (
    <AppShell
      name="Net Worth Tracker"
      icon="wallet"
      hue="cobalt"
      category="Finance"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status={`Net worth ${formatMoney(netWorth)}`}
    >
      <div className="lc-tabs" role="tablist">
        {(['Entries', 'Breakdown'] as const).map((item) => (
          <button
            type="button"
            role="tab"
            aria-selected={tab === item}
            key={item}
            className={`lc-tab${tab === item ? ' active' : ''}`}
            style={tab !== item ? { color: 'var(--ink-60)' } : undefined}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Entries' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card mono="New" title="Add an entry">
            <FormGrid>
              <TextInput
                label="Name"
                value={name}
                onChange={setName}
                error={errorField === 'name' ? formError : null}
                placeholder="e.g. House"
              />
              <Select
                label="Type"
                value={kind}
                onChange={handleKindChange}
                options={[
                  { value: 'asset', label: 'Asset' },
                  { value: 'liability', label: 'Liability' },
                ]}
              />
              <Select
                label="Category"
                value={category}
                onChange={setCategory}
                options={categories}
              />
              <TextInput
                label="Value"
                value={value}
                onChange={setValue}
                type="number"
                inputMode="decimal"
                placeholder="e.g. 350000"
                error={formError}
              />
            </FormGrid>
            <Actions>
              <Button kind="primary" onClick={addEntry}>Add entry</Button>
              {entries.length > 0 && (
                <Button kind="secondary" onClick={exportCsv}>Export CSV</Button>
              )}
            </Actions>
          </Card>

          <KpiRow>
            <Kpi value={`Total Assets: ${formatMoney(totalAssets)}`} label="Assets" />
            <Kpi value={`Total Liabilities: ${formatMoney(totalLiabilities)}`} label="Liabilities" />
            <Kpi
              value={`Net Worth: ${formatMoney(netWorth)}`}
              label="Net worth"
              accent={netWorth >= 0}
            />
          </KpiRow>

          <Card
            mono={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
            title="Your entries"
          >
            {entries.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No entries yet"
                detail="Add your first asset or liability above."
                actionLabel="Add an entry"
                onAction={addEntry}
              />
            ) : (
              <List label="Entries">
                {entries.map((entry) => (
                  <Row
                    key={entry.id}
                    title={entry.data.name}
                    meta={`${entry.data.kind === 'asset' ? 'Asset' : 'Liability'} · ${entry.data.category}`}
                    value={formatMoney(
                      entry.data.kind === 'asset' ? entry.data.value : -entry.data.value,
                    )}
                    action={
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${entry.data.name}`}
                        onClick={() => actions.remove(entry.id)}
                      >
                        Delete
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Card>
        </div>
      ) : (
        <Card mono="Breakdown" title="By category">
          {breakdown.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="Nothing to break down"
              detail="Add entries to see the category breakdown."
              actionLabel="Go to Entries"
              onAction={() => setTab('Entries')}
            />
          ) : (
            <DonutChart slices={breakdown} />
          )}
        </Card>
      )}
    </AppShell>
  )
}
