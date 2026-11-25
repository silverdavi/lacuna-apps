// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { AppShell, Button, Card, EmptyState, Stack, Table } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { store, type Conversion } from './host'

const TZ: [string, string][] = [
  ['UTC', 'Etc/UTC'],
  ['New York', 'America/New_York'],
  ['London', 'Europe/London'],
  ['Tokyo', 'Asia/Tokyo'],
  ['Sydney', 'Australia/Sydney'],
]

const TZ_OPTIONS = TZ.map(([label]) => ({ value: label, label }))
const IANA: Record<string, string> = Object.fromEntries(TZ)

function zonedTimeToUtcMs(ianaTz: string, date: string, time: string): number | null {
  const [y, mo, d] = date.split('-').map(Number)
  const [h, mi] = time.split(':').map(Number)
  if ([y, mo, d, h, mi].some((v) => Number.isNaN(v))) return null
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
  function offsetAt(utcMs: number): number {
    const parts = Object.fromEntries(dtf.formatToParts(utcMs).map((p) => [p.type, p.value]))
    const tzAsUtc = Date.UTC(
      +parts.year!,
      +parts.month! - 1,
      +parts.day!,
      +parts.hour! % 24,
      +parts.minute!,
      +parts.second!,
    )
    return tzAsUtc - utcMs
  }
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  let utcMs = guess - offsetAt(guess)
  const offset2 = offsetAt(utcMs)
  if (offset2 !== offsetAt(guess)) {
    utcMs = guess - offset2
  }
  return utcMs
}

function utcMsToZonedTime(ianaTz: string, utcMs: number): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(dtf.formatToParts(utcMs).map((p) => [p.type, p.value]))
  const hh = (+parts.hour!) % 24 === 0 && +parts.hour! === 24 ? '00' : String(+parts.hour!).padStart(2, '0')
  return `${hh}:${parts.minute!}`
}

function convert(sourceLabel: string, targetLabel: string, date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const sourceIana = IANA[sourceLabel]
  const targetIana = IANA[targetLabel]
  if (!sourceIana || !targetIana) return null
  const utcMs = zonedTimeToUtcMs(sourceIana, date, time)
  if (utcMs === null) return null
  return utcMsToZonedTime(targetIana, utcMs)
}

function LabeledSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="tzc-field">
      <label className="tzc-field-label" htmlFor={id}>
        {label}
      </label>
      <select className="lc-input" id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function LabeledInput({
  id,
  label,
  type,
  value,
  onChange,
  readOnly,
}: {
  id: string
  label: string
  type: string
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="tzc-field">
      <label className="tzc-field-label" htmlFor={id}>
        {label}
      </label>
      <input
        className="lc-input"
        id={id}
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function HistoryTable({ history }: { history: Conversion[] }) {
  if (history.length === 0) {
    return (
      <EmptyState
        mono="Empty"
        title="No conversions yet"
        detail="Save a conversion to see it here."
        actionLabel="Save a conversion to get started"
      />
    )
  }
  return (
    <Table
      label="Saved conversions"
      columns={[
        { key: 'source', label: 'Source' },
        { key: 'target', label: 'Target' },
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'result', label: 'Result' },
      ]}
      rows={history.map((h) => ({
        cells: {
          source: h.source,
          target: h.target,
          date: h.date,
          time: h.time,
          result: h.result,
        },
      }))}
    />
  )
}

export function App() {
  const [source, setSource] = useState('UTC')
  const [target, setTarget] = useState('New York')
  const [date, setDate] = useState('2024-01-15')
  const [time, setTime] = useState('14:30')
  const [tab, setTab] = useState<'Convert' | 'History'>('Convert')
  const [history, setHistory] = useState<Conversion[]>(() => store.list())

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const result = useMemo(() => convert(source, target, date, time), [source, target, date, time])

  function save() {
    if (!result) return
    const entry = {
      source,
      target,
      date,
      time,
      result,
    }
    store.add(entry)
    setHistory(store.list())
  }

  function swap() {
    setSource(target)
    setTarget(source)
  }

  function copyResult() {
    if (result) void copy(result)
  }

  return (
    <AppShell
      name="Timezone Converter"
      icon="calendar"
      hue="blue"
      category="Tools"
      meta={history.length > 0 ? `${history.length} saved` : undefined}
    >
      <div className="lc-tabs tzc-tabs" role="tablist" aria-label="Converter views">
        {(['Convert', 'History'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={tab === t ? 'tzc-tab active' : 'tzc-tab'}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Convert' ? (
        <Stack>
          <Card mono="Input" title="Convert">
            <div className="lk-form">
              <LabeledSelect
                id="source-tz"
                label="Source timezone"
                value={source}
                onChange={setSource}
                options={TZ_OPTIONS}
              />
              <LabeledSelect
                id="target-tz"
                label="Target timezone"
                value={target}
                onChange={setTarget}
                options={TZ_OPTIONS}
              />
              <LabeledInput id="date" label="Date" type="date" value={date} onChange={setDate} />
              <LabeledInput id="time" label="Time" type="time" value={time} onChange={setTime} />
              <LabeledInput id="result" label="Result time" type="text" value={result ?? ''} onChange={() => {}} readOnly />
            </div>
            <div className="tzc-actions">
              <Button kind="primary" onClick={save} disabled={!result}>
                Save conversion
              </Button>
              <Button onClick={swap}>Swap</Button>
              <Button onClick={copyResult} disabled={!result}>
                {copied ? 'Copied' : 'Copy result'}
              </Button>
            </div>
          </Card>
          <Card mono="Saved conversions" title="History">
            <HistoryTable history={history} />
          </Card>
        </Stack>
      ) : (
        <Card mono="Saved conversions" title="History">
          <HistoryTable history={history} />
        </Card>
      )}
    </AppShell>
  )
}
