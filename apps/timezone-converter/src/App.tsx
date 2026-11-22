// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, Select, Stack, Table, TextInput } from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import { store, type Conversion } from './host'

const TZ_LABELS: [string, string][] = [
  ['UTC', 'UTC'],
  ['America/New_York', 'New York'],
  ['America/Chicago', 'Chicago'],
  ['America/Denver', 'Denver'],
  ['America/Los_Angeles', 'Los Angeles'],
  ['America/Sao_Paulo', 'Sao Paulo'],
  ['Europe/London', 'London'],
  ['Europe/Paris', 'Paris'],
  ['Europe/Berlin', 'Berlin'],
  ['Europe/Moscow', 'Moscow'],
  ['Asia/Tokyo', 'Tokyo'],
  ['Asia/Shanghai', 'Shanghai'],
  ['Asia/Kolkata', 'Kolkata'],
  ['Asia/Seoul', 'Seoul'],
  ['Australia/Sydney', 'Sydney'],
  ['Pacific/Auckland', 'Auckland'],
]

const TZ_OPTIONS = TZ_LABELS.map(([value, label]) => ({ value, label }))

const OFFSET_H: Record<string, number> = {
  'UTC': 0,
  'America/New_York': -5,
  'America/Chicago': -6,
  'America/Denver': -7,
  'America/Los_Angeles': -8,
  'America/Sao_Paulo': -3,
  'Europe/London': 0,
  'Europe/Paris': 1,
  'Europe/Berlin': 1,
  'Europe/Moscow': 3,
  'Asia/Tokyo': 9,
  'Asia/Shanghai': 8,
  'Asia/Kolkata': 5.5,
  'Asia/Seoul': 9,
  'Australia/Sydney': 10,
  'Pacific/Auckland': 12,
}

function labelOf(tz: string): string {
  return TZ_LABELS.find(([value]) => value === tz)?.[1] ?? tz
}

function convert(sourceTz: string, targetTz: string, date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null
  const fromHour = OFFSET_H[sourceTz] ?? 0
  const toHour = OFFSET_H[targetTz] ?? 0
  const utcMs =
    Date.UTC(
      +date.slice(0, 4),
      +date.slice(5, 7) - 1,
      +date.slice(8, 10),
      +time.slice(0, 2),
      +time.slice(3, 5),
    ) - fromHour * 3600_000
  const targetMs = utcMs + toHour * 3600_000
  const totalMin = Math.round(targetMs / 60_000) % 1440
  const min = (totalMin + 1440) % 1440
  const hh = String(Math.floor(min / 60)).padStart(2, '0')
  const mm = String(min % 60).padStart(2, '0')
  return `${hh}:${mm}`
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
  const [target, setTarget] = useState('America/New_York')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [tab, setTab] = useState<'Convert' | 'History'>('Convert')
  const [history, setHistory] = useState<Conversion[]>(() => store.list())

  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const result = useMemo(() => convert(source, target, date, time), [source, target, date, time])

  function save() {
    if (!result) return
    const entry = {
      source: labelOf(source),
      target: labelOf(target),
      date,
      time,
      result,
    }
    const record = store.add(entry)
    setHistory(store.list())
    void record
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
            <FormGrid>
              <Select
                label="Source timezone"
                value={source}
                onChange={setSource}
                options={TZ_OPTIONS}
              />
              <Select
                label="Target timezone"
                value={target}
                onChange={setTarget}
                options={TZ_OPTIONS}
              />
              <TextInput label="Date" type="date" value={date} onChange={setDate} />
              <TextInput label="Time" type="time" value={time} onChange={setTime} />
              <TextInput label="Result time" type="text" value={result ?? ''} onChange={() => {}} />
            </FormGrid>
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
