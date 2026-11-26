// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
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
  List,
  Rail,
  Row,
  SectionLabel,
  Stack,
  Table,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { settings, store, type Conversion, type Settings } from './host'

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
  const hh = String(+parts.hour! % 24 === 0 && +parts.hour! === 24 ? 0 : +parts.hour!).padStart(2, '0')
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

function offsetLabel(ianaTz: string): string {
  const ms = Date.now()
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
  const parts = Object.fromEntries(dtf.formatToParts(ms).map((p) => [p.type, p.value]))
  const tzAsUtc = Date.UTC(
    +parts.year!,
    +parts.month! - 1,
    +parts.day!,
    +parts.hour! % 24,
    +parts.minute!,
    +parts.second!,
  )
  let offsetMin = Math.round((tzAsUtc - ms) / 60000)
  const sign = offsetMin < 0 ? '-' : '+'
  offsetMin = Math.abs(offsetMin)
  const hh = String(Math.floor(offsetMin / 60)).padStart(2, '0')
  const mm = String(offsetMin % 60).padStart(2, '0')
  return `UTC${sign}${hh}:${mm}`
}

function todayInZone(ianaTz: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(dtf.formatToParts(Date.now()).map((p) => [p.type, p.value]))
  return `${parts.year!}-${parts.month!}-${parts.day!}`
}

function nowInZone(ianaTz: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(dtf.formatToParts(Date.now()).map((p) => [p.type, p.value]))
  const hh = String(+parts.hour! % 24 === 0 && +parts.hour! === 24 ? 0 : +parts.hour!).padStart(2, '0')
  return `${hh}:${parts.minute!}`
}

function dayOfWeek(date: string, ianaTz: string): string {
  const utcMs = zonedTimeToUtcMs(ianaTz, date, '12:00')
  if (utcMs === null) return ''
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: ianaTz, weekday: 'short' })
  return dtf.format(utcMs)
}

const EMPTY = { source: 'UTC', target: 'New York' } as const

function loadInitial(): Settings {
  const s = settings.get()
  const source = IANA[s.source] ? s.source : EMPTY.source
  const target = IANA[s.target] ? s.target : EMPTY.target
  return { source, target }
}

function exportJson(rows: Conversion[]): string {
  return JSON.stringify(
    {
      format: 'lacuna.timezone-converter.history',
      version: 1,
      exportedAt: new Date().toISOString(),
      rows: rows.map(({ id, ...rest }) => rest),
    },
    null,
    2,
  )
}

function importJson(text: string): { rows: Omit<Conversion, 'id'>[]; error: string | null } {
  const trimmed = text.trim()
  if (trimmed === '') return { rows: [], error: 'Paste a JSON file to import its saved conversions.' }
  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return { rows: [], error: 'Not valid JSON. Export history as JSON and paste it here.' }
  }
  const obj = parsed as { rows?: unknown }
  const rawRows = Array.isArray(obj) ? obj : Array.isArray(obj.rows) ? obj.rows : null
  if (rawRows === null) {
    return { rows: [], error: 'Expected an array of conversions or a file with a "rows" array.' }
  }
  const rows: Omit<Conversion, 'id'>[] = []
  for (const item of rawRows) {
    const r = item as Record<string, unknown>
    if (
      typeof r.source === 'string' &&
      IANA[r.source] !== undefined &&
      typeof r.target === 'string' &&
      IANA[r.target] !== undefined &&
      typeof r.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
      typeof r.time === 'string' &&
      /^\d{2}:\d{2}$/.test(r.time) &&
      typeof r.result === 'string'
    ) {
      rows.push({ source: r.source, target: r.target, date: r.date, time: r.time, result: r.result })
    }
  }
  if (rows.length === 0) {
    return { rows: [], error: 'No valid conversions found in that file.' }
  }
  return { rows, error: null }
}

type Flash = { ok: boolean; text: string } | null
type Tab = 'Convert' | 'History'

function HistoryTable({ history, onRemove }: { history: Conversion[]; onRemove: (id: string) => void }) {
  return (
    <Table
      label="Saved conversions"
      columns={[
        { key: 'source', label: 'Source' },
        { key: 'target', label: 'Target' },
        { key: 'date', label: 'Date' },
        { key: 'time', label: 'Time' },
        { key: 'result', label: 'Result' },
        { key: 'remove', label: '' },
      ]}
      rows={history.map((h) => ({
        cells: {
          source: h.source,
          target: h.target,
          date: h.date,
          time: h.time,
          result: h.result,
          remove: (
            <Button
              kind="ghost"
              ariaLabel={`Remove ${h.source} to ${h.target} conversion`}
              onClick={() => onRemove(h.id)}
            >
              Remove
            </Button>
          ),
        },
      }))}
    />
  )
}

export function App() {
  const [initial] = useState(loadInitial)
  const [source, setSource] = useState(initial.source)
  const [target, setTarget] = useState(initial.target)
  const [date, setDate] = useState(todayInZone(IANA[initial.source]))
  const [time, setTime] = useState(nowInZone(IANA[initial.source]))
  const [tab, setTab] = useState<Tab>('Convert')
  const [history, setHistory] = useState<Conversion[]>(() => store.list())
  const [flash, setFlash] = useState<Flash>(null)
  const [importText, setImportText] = useState('')

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const result = useMemo(() => convert(source, target, date, time), [source, target, date, time])

  useEffect(() => {
    settings.set({ source, target })
  }, [source, target])

  useEffect(() => {
    if (flash === null) return
    const t = window.setTimeout(() => setFlash(null), 2500)
    return () => window.clearTimeout(t)
  }, [flash])

  function save() {
    if (!result) return
    store.add({ source, target, date, time, result })
    setHistory(store.list())
    setFlash({ ok: true, text: 'Saved to history' })
  }

  function remove(id: string) {
    store.remove(id)
    setHistory(store.list())
  }

  function swap() {
    setSource(target)
    setTarget(source)
  }

  function copyResult() {
    if (result) void copy(result)
  }

  function downloadJson() {
    const blob = new Blob([exportJson(history)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'timezone-conversions.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setFlash({ ok: true, text: 'Exported history as JSON' })
  }

  function runImport() {
    const { rows, error } = importJson(importText)
    if (error) {
      setFlash({ ok: false, text: error })
      return
    }
    for (const row of rows) store.add(row)
    setHistory(store.list())
    setImportText('')
    setFlash({ ok: true, text: `Imported ${rows.length} conversion${rows.length === 1 ? '' : 's'}` })
  }

  function clearHistory() {
    store.clear()
    setHistory(store.list())
    setFlash({ ok: true, text: 'History cleared' })
  }

  const weekday = result !== null && result !== '' ? dayOfWeek(date, IANA[source]) : ''

  const historyActions = (
    <Actions>
      <Button kind="ghost" onClick={downloadJson} disabled={history.length === 0}>
        Export JSON
      </Button>
      <Button kind="ghost" ariaLabel="Clear history" onClick={clearHistory} disabled={history.length === 0}>
        Clear
      </Button>
    </Actions>
  )

  const historyBody =
    history.length === 0 ? (
      <EmptyState
        mono="Empty"
        title="No conversions yet"
        detail="Save a conversion to see it here."
        actionLabel="Save a conversion to get started"
      />
    ) : (
      <HistoryTable history={history} onRemove={remove} />
    )

  return (
    <AppShell
      name="Timezone Converter"
      icon="calendar"
      hue="blue"
      category="Tools"
      meta={history.length > 0 ? `${history.length} saved` : undefined}
      side={
        <Rail
          note="Pick two zones, read the result"
          chips={[`Source · ${offsetLabel(IANA[source])}`, `Target · ${offsetLabel(IANA[target])}`]}
        >
          <SectionLabel>Now in each zone</SectionLabel>
          <List label="Current time in each zone">
            {TZ.map(([label, iana]) => (
              <Row
                key={label}
                title={label}
                meta={label === source ? 'source' : label === target ? 'target' : undefined}
                value={nowInZone(iana)}
              />
            ))}
          </List>
          <div style={{ height: 'calc(12px * var(--sf))' }} />
          <SectionLabel>Notes</SectionLabel>
          <Stack>
            <Tag accent>Conversions use the IANA database</Tag>
          </Stack>
        </Rail>
      }
    >
      <div role="tablist" aria-label="Panels">
        {(['Convert', 'History'] as const).map((t) => (
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

      {tab === 'Convert' ? (
        <Stack>
          <Card mono="Input" title="Convert">
            <FormGrid>
              <div className="lc-field">
                <label className="lc-field-label" htmlFor="tz-source">Source timezone</label>
                <select id="tz-source" className="lc-input" value={source} onChange={(e) => setSource(e.target.value)}>
                  {TZ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="lc-field">
                <label className="lc-field-label" htmlFor="tz-target">Target timezone</label>
                <select id="tz-target" className="lc-input" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {TZ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <TextInput label="Date" type="date" value={date} onChange={setDate} />
              <TextInput label="Time" type="time" value={time} onChange={setTime} />
            </FormGrid>
            <div style={{ height: 'calc(16px * var(--sf))' }} />
            <div className="lc-field">
              <label className="lc-field-label" htmlFor="tz-result">Result time</label>
              <input id="tz-result" className="lc-input" type="text" value={result ?? ''} readOnly />
            </div>
            <div style={{ height: 'calc(16px * var(--sf))' }} />
            <Actions>
              <Button kind="primary" onClick={save} disabled={!result}>
                Save conversion
              </Button>
              <Button onClick={swap}>Swap</Button>
              <Button onClick={copyResult} disabled={!result}>
                {copied ? 'Copied' : 'Copy result'}
              </Button>
            </Actions>
            {flash && (
              <p role="status" style={{ margin: 0 }}>
                {flash.text}
              </p>
            )}
          </Card>

          {result ? (
            <Card mono="Result" title={`It is ${result} in ${target}`}>
              <KpiRow>
                <Kpi value={result} label={`Time in ${target}`} accent />
                <Kpi value={weekday} label={`Day of week in ${source}`} />
                <Kpi value={date} label="Date in source zone" />
              </KpiRow>
            </Card>
          ) : (
            <Card mono="Result" title="Result">
              <ErrorState
                title="No result yet"
                detail="Enter a valid date and time in a supported zone to see the converted time."
              />
            </Card>
          )}

          <Card mono={`History · ${history.length}`} title="History" actions={historyActions}>
            {historyBody}
          </Card>

          <Card mono="Import" title="Import conversions">
            <FormGrid>
              <TextInput
                label="Paste exported JSON"
                value={importText}
                onChange={setImportText}
                rows={3}
                placeholder='{"rows": [{"source": "UTC", "target": "London", "date": "2024-03-10", "time": "12:00", "result": "12:00"}]}'
              />
            </FormGrid>
            <Actions>
              <Button onClick={runImport} disabled={importText.trim() === ''}>
                Load conversions
              </Button>
            </Actions>
          </Card>
        </Stack>
      ) : (
        <Card mono={`History · ${history.length}`} title="History" actions={historyActions}>
          {historyBody}
        </Card>
      )}
    </AppShell>
  )
}
