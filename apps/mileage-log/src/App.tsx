// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from '@lacuna/use-hotkeys'
import {
  AppShell, Button, Card, EmptyState, FormGrid, Keys, Kpi, KpiRow,
  Rail, Table, Tag, TextInput, PrimaryButton,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { loadEntries, addEntry, deleteEntry, saveAll, validateEntry, type EntryInput, type EntryErrors, type MileageEntry } from './host'
import { LIMITS } from './host/mock'

const EMPTY_FORM = { odometer: '', gallons: '', cost: '', note: '' }

type View = 'entries' | 'summary' | 'table'

function summary(entries: MileageEntry[]) {
  if (entries.length === 0) return null
  const ordered = [...entries].sort((a, b) => a.odometer - b.odometer)
  const totalMiles = ordered[ordered.length - 1].odometer
  const spanMiles = ordered[ordered.length - 1].odometer - ordered[0].odometer
  const totalGallons = entries.reduce((sum, e) => sum + e.gallons, 0)
  const totalCost = entries.reduce((sum, e) => sum + e.cost, 0)
  const avgMpg = spanMiles > 0 && totalGallons > 0 ? spanMiles / totalGallons : null
  return { totalMiles, totalGallons, totalCost, avgMpg, count: entries.length }
}

function parseNum(value: string): number {
  if (value.trim() === '') return Number.NaN
  return Number(value)
}

function cxTab(active: boolean): string {
  return `lc-tab${active ? ' active' : ''}`
}

function NumberInput({ label, value, onChange, placeholder, error, hint, inputRef }: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string | null
  hint?: string
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <label className="lc-field">
      <span className="lc-field-label">{label}</span>
      <input
        ref={inputRef}
        className="lc-input"
        inputMode="decimal"
        value={value}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <span className="lk-field-error" role="alert">{error}</span> : hint ? <span className="lk-field-hint">{hint}</span> : null}
    </label>
  )
}

function SearchInput({ value, onChange, placeholder, inputRef }: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  inputRef?: React.Ref<HTMLInputElement>
}) {
  return (
    <div style={{ marginBottom: 'calc(10px * var(--sf))' }}>
      <label className="lc-field">
        <span className="lc-field-label">Search</span>
        <input
          ref={inputRef}
          className="lc-input"
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    </div>
  )
}

function toCsv(entries: MileageEntry[]): string {
  const esc = (v: string | number) => (String(v).includes('"') || String(v).includes(',') ? '"' + String(v).replace(/"/g, '""') + '"' : String(v))
  const lines = ['odometer,gallons,cost,note']
  for (const e of [...entries].sort((a, b) => a.odometer - b.odometer)) {
    lines.push([e.odometer, e.gallons, e.cost.toFixed(2), esc(e.note)].join(','))
  }
  return lines.join('\n') + '\n'
}

export function App() {
  const [entries, setEntries] = useState<MileageEntry[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<EntryErrors>({})
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('entries')
  const [showForm, setShowForm] = useState(false)
  const [lastDeleted, setLastDeleted] = useState<MileageEntry | null>(null)
  const { copy } = useClipboard()
  const odometerRef = useRef<HTMLInputElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return entries
    return entries.filter(e => e.note.toLowerCase().includes(q) || String(e.odometer).includes(q))
  }, [entries, query])

  const stats = useMemo(() => summary(entries), [entries])

  const ordered = useMemo(() => [...entries].sort((a, b) => a.odometer - b.odometer), [entries])
  const lastReading = ordered[ordered.length - 1]

  const chips = useMemo(() => {
    if (!stats) return ['No readings yet']
    const out = [`${stats.count} ${stats.count === 1 ? 'reading' : 'readings'}`]
    if (stats.avgMpg != null) out.push(`${stats.avgMpg.toFixed(1)} MPG`)
    return out
  }, [stats])

  const status = useMemo(() => {
    if (entries.length === 0) return 'Ready — add a reading to begin'
    const parts = [`${entries.length} ${entries.length === 1 ? 'reading' : 'readings'} logged`]
    if (stats?.totalMiles != null) parts.push(`${stats.totalMiles.toLocaleString('en-US')} miles since first`)
    if (stats?.avgMpg != null) parts.push(`avg ${stats.avgMpg.toFixed(1)} MPG`)
    return parts.join(' · ')
  }, [entries.length, stats])

  const undoDelete = useCallback(async () => {
    if (!lastDeleted) return
    const restored = lastDeleted
    setLastDeleted(null)
    setEntries(prev => [...prev, restored])
    await saveAll([...entries, restored])
  }, [lastDeleted, entries])

  useHotkeys([
    { keys: 'mod+k', handler: () => searchRef.current?.focus() },
    { keys: 'n', handler: () => { setView('entries'); setShowForm(true); setTimeout(() => odometerRef.current?.focus(), 0) } },
  ])

  async function submit() {
    const input: EntryInput = {
      odometer: parseNum(form.odometer),
      gallons: parseNum(form.gallons),
      cost: parseNum(form.cost),
      note: form.note,
    }
    const errs = validateEntry(input)
    setFieldErrors(errs)
    if (Object.keys(errs).length > 0) return
    const result = await addEntry(input)
    if (result.error) {
      setFieldErrors({ odometer: result.error })
      return
    }
    setEntries(prev => [...prev, result.entry])
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setShowForm(false)
  }

  function focusForm() {
    setView('entries')
    setShowForm(true)
  }

  async function remove(id: string) {
    const gone = entries.find(e => e.id === id)
    await deleteEntry(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    if (gone) setLastDeleted(gone)
  }

  const tableRows = filtered.map(e => {
    const idx = ordered.findIndex(o => o.id === e.id)
    const prev = idx > 0 ? ordered[idx - 1] : null
    const miles = prev ? e.odometer - prev.odometer : 0
    const mpg = miles > 0 && e.gallons > 0 ? miles / e.gallons : null
    return {
      cells: {
        odometer: e.odometer.toLocaleString('en-US'),
        miles: prev ? miles.toLocaleString('en-US') : '—',
        gallons: e.gallons.toFixed(2),
        cost: `$${e.cost.toFixed(2)}`,
        mpg: mpg != null ? mpg.toFixed(1) : '—',
        note: e.note || '—',
      },
    }
  })

  return (
    <AppShell
      name="Vehicle Mileage Log"
      icon="analytics"
      hue="teal"
      category="Tracking"
      meta={`${entries.length} ITEM${entries.length === 1 ? '' : 'S'}`}
      status={status}
      side={
        <Rail
          title="Fleet"
          note={lastReading ? `Last reading at ${lastReading.odometer.toLocaleString('en-US')} mi` : 'No data yet'}
          chips={chips}
        >
          <div style={{ display: 'grid', gap: 'calc(8px * var(--sf))' }}>
            {lastDeleted ? (
              <Button kind="secondary" onClick={undoDelete}>Restore last deleted</Button>
            ) : null}
            {entries.length > 0 ? (
              <Button kind="secondary" onClick={() => copy(toCsv(entries))}>Export CSV</Button>
            ) : null}
            <Keys items={[['N', 'New reading'], ['Ctrl K', 'Filter']]} />
          </div>
        </Rail>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--sf))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="lc-tabs" role="tablist">
            {(['Entries', 'Summary', 'Table'] as const).map(label => {
              const value = label === 'Entries' ? 'entries' : label === 'Summary' ? 'summary' : 'table'
              return (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={view === value}
                  className={cxTab(view === value)}
                  onClick={() => setView(value)}
                >{label}</button>
              )
            })}
          </div>
          {stats?.avgMpg != null ? <Tag accent>Avg {stats.avgMpg.toFixed(1)} MPG</Tag> : null}
        </div>

        {stats ? (
          <div style={{ display: 'flex', gap: 'calc(16px * var(--sf))', flexWrap: 'wrap' }}>
            <Tag>Readings: {stats.count}</Tag>
            <Tag>Total miles: {stats.totalMiles}</Tag>
            <Tag>Total cost: ${stats.totalCost.toFixed(2)}</Tag>
            {stats.avgMpg != null ? <Tag accent>Avg MPG: {stats.avgMpg.toFixed(1)}</Tag> : null}
          </div>
        ) : null}

        <Card title="New reading" mono="Odometer · gallons · cost · note"
          actions={showForm ? <Button kind="ghost" onClick={() => setShowForm(false)}>Cancel</Button> : undefined}>
          {showForm ? (
            <>
              <FormGrid>
                <NumberInput label="Odometer" value={form.odometer}
                  onChange={(v) => setForm(f => ({ ...f, odometer: v }))}
                  placeholder="e.g. 42150" error={fieldErrors.odometer} inputRef={odometerRef} />
                <NumberInput label="Gallons" value={form.gallons}
                  onChange={(v) => setForm(f => ({ ...f, gallons: v }))}
                  placeholder="e.g. 12.4" error={fieldErrors.gallons} />
                <NumberInput label="Cost" value={form.cost}
                  onChange={(v) => setForm(f => ({ ...f, cost: v }))}
                  placeholder="e.g. 48.10" error={fieldErrors.cost} />
                <TextInput label="Note" value={form.note}
                  onChange={(v) => setForm(f => ({ ...f, note: v }))}
                  placeholder="Optional — station, service, remarks" error={fieldErrors.note} />
              </FormGrid>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'calc(10px * var(--sf))' }}>
                <PrimaryButton onClick={submit}>Save</PrimaryButton>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 'calc(12px * var(--sf)) 0' }}>
              <Button kind="secondary" onClick={() => { setShowForm(true); setTimeout(() => odometerRef.current?.focus(), 0) }}>Add entry</Button>
            </div>
          )}
        </Card>

        {view === 'entries' && (
          <Card title="Readings" mono={`${filtered.length} of ${entries.length}`}>
            <SearchInput value={query} onChange={setQuery}
              placeholder="Filter by note or odometer (Ctrl K)" inputRef={searchRef} />
            {filtered.length === 0 ? (
              <EmptyState
                title={entries.length === 0 ? 'No readings yet' : 'No matches'}
                detail={entries.length === 0 ? 'Log your first fill-up above to start tracking mileage and cost.' : 'Try a different filter.'}
                actionLabel={entries.length === 0 ? 'Add a reading' : undefined}
                onAction={entries.length === 0 ? focusForm : undefined}
              />
            ) : (
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))', margin: 0, padding: 0, listStyle: 'none' }}>
                {[...filtered].reverse().map(e => {
                  const idx = ordered.findIndex(o => o.id === e.id)
                  const prev = idx > 0 ? ordered[idx - 1] : null
                  const miles = prev ? e.odometer - prev.odometer : 0
                  const mpg = miles > 0 && e.gallons > 0 ? miles / e.gallons : null
                  return (
                    <li key={e.id} style={{ display: 'flex', gap: 'calc(12px * var(--sf))', alignItems: 'baseline', borderBottom: 'calc(1px * var(--sf)) solid var(--hairline)', paddingBottom: 'calc(8px * var(--sf))' }}>
                      <span className="lc-mono" style={{ minWidth: '8ch' }}>{e.odometer}</span>
                      <span style={{ flex: 1 }}>{e.note ? e.note : <span className="lc-faint">No note</span>}</span>
                      <span className="lc-mono lc-mono-sm">{e.gallons} gal · ${e.cost.toFixed(2)}</span>
                      {mpg != null ? <span className="lc-mono lc-mono-sm lc-accent">{mpg.toFixed(1)} mpg</span> : null}
                      <Button kind="ghost" ariaLabel="Delete reading" onClick={() => remove(e.id)}>Delete</Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        )}

        {view === 'summary' && (
          <Card title="Summary" mono={stats ? `${stats.count} readings` : 'No data'}>
            {stats ? (
              <div style={{ display: 'grid', gap: 'calc(14px * var(--sf))' }}>
                <KpiRow>
                  <Kpi value={stats.avgMpg != null ? stats.avgMpg.toFixed(1) : '—'} label="Avg MPG" accent />
                  <Kpi value={stats.totalMiles} label="Miles since first" />
                  <Kpi value={`$${stats.totalCost.toFixed(2)}`} label="Fuel spent" />
                </KpiRow>
                <Table
                  label="Summary"
                  columns={[{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value', num: true }]}
                  rows={[
                    { cells: { metric: 'Readings', value: String(stats.count) } },
                    { cells: { metric: 'Miles since first', value: String(stats.totalMiles) } },
                    { cells: { metric: 'Total fuel', value: `${stats.totalGallons} gal` } },
                    { cells: { metric: 'Total cost', value: `$${stats.totalCost.toFixed(2)}` } },
                    { cells: { metric: 'Average MPG', value: stats.avgMpg != null ? stats.avgMpg.toFixed(1) : '—' }, hot: true },
                  ]}
                />
              </div>
            ) : (
              <EmptyState title="Nothing to summarize" detail="Add a few readings and the totals will appear here." actionLabel="Add a reading" onAction={focusForm} />
            )}
          </Card>
        )}

        {view === 'table' && (
          <Card title="Readings table" mono="Full data">
            {entries.length === 0 ? (
              <EmptyState title="No readings yet" detail="Log a reading to see the full table." actionLabel="Add a reading" onAction={focusForm} />
            ) : (
              <Table
                label="Mileage readings"
                columns={[
                  { key: 'odometer', label: 'Mileage', num: true },
                  { key: 'miles', label: 'Since last', num: true },
                  { key: 'gallons', label: 'Gallons', num: true },
                  { key: 'cost', label: 'Cost', num: true },
                  { key: 'mpg', label: 'MPG', num: true },
                  { key: 'note', label: 'Note' },
                ]}
                rows={tableRows}
                foot={stats ? {
                  odometer: entries.length > 1 ? stats!.totalMiles.toLocaleString('en-US') : '—',
                  miles: '',
                  gallons: stats!.totalGallons.toFixed(2),
                  cost: `$${stats!.totalCost.toFixed(2)}`,
                  mpg: stats!.avgMpg != null ? stats!.avgMpg.toFixed(1) : '—',
                  note: `${stats!.count} readings`,
                } : undefined}
              />
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
