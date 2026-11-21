// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  MonoLabel,
  Rail,
  SectionLabel,
  Select,
  Stack,
  Tag,
  TextInput,
  Title,
} from '@lacuna/ui'
import { Heatmap } from '@lacuna/heatmap'
import { Chart } from '@lacuna/chart'
import { ExportMenu } from '@lacuna/export-menu'
import type { ExportOption } from '@lacuna/export-menu'
import { exportBackup } from '@lacuna/json-backup'
import { computeStreaks } from '@lacuna/streak-calc'
import { toISODate, fromISODate, addDays } from '@lacuna/date-math'
import { useClipboard } from '@lacuna/use-clipboard'
import { loadState, saveState, makeId } from './host'
import type { SymptomEntry, SymptomState } from './host'

const TABS = ['Log', 'Calendar', 'Trends'] as const
type Tab = (typeof TABS)[number]

const SEVERITY_OPTIONS = ['1', '2', '3', '4', '5']

const tabButtonStyle = (active: boolean): CSSProperties => ({
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  color: active ? 'var(--paper)' : 'var(--ink)',
  background: active ? 'var(--ink)' : 'transparent',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(7px * var(--sf))',
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  cursor: 'pointer',
})

const detailDayStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'calc(8px * var(--sf))',
  padding: 'calc(8px * var(--sf)) 0',
  borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)',
}

const cellHeaderStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(11px * var(--tf))',
  color: 'var(--ink-dim)',
  padding: 'calc(4px * var(--sf))',
  textAlign: 'center',
}

const dayCellStyle: CSSProperties = {
  width: 'calc(40px * var(--sf))',
  height: 'calc(40px * var(--sf))',
  borderRadius: 'calc(7px * var(--sf))',
  margin: 'calc(2px * var(--sf))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  cursor: 'pointer',
  boxSizing: 'border-box',
}

function isoToday(): string {
  return toISODate(new Date())
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function monthGrid(date: string | null, entries: SymptomEntry[]) {
  const ref = (date ? fromISODate(date) : null) ?? new Date()
  const year = ref.getFullYear()
  const month = ref.getMonth()
  const first = new Date(year, month, 1)
  const lead = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const byDay = new Map<number, SymptomEntry[]>()
  for (const e of entries) {
    const d = fromISODate(e.date)
    if (!d) continue
    if (d.getFullYear() !== year || d.getMonth() !== month) continue
    const arr = byDay.get(d.getDate()) ?? []
    arr.push(e)
    byDay.set(d.getDate(), arr)
  }
  const cells: Array<{ day: number | null; iso: string | null }> = []
  for (let i = 0; i < lead; i++) cells.push({ day: null, iso: null })
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, iso: toISODate(new Date(year, month, day)) })
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, iso: null })
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return { cells, byDay, monthLabel }
}

function MonthGrid({ date, entries, onSelect }: { date: string | null; entries: SymptomEntry[]; onSelect: (iso: string) => void }) {
  const { cells, byDay, monthLabel } = monthGrid(date, entries)
  const selected = date
  return (
    <div role="table" aria-label={monthLabel}>
      <div role="row" aria-label="Weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} role="columnheader" style={cellHeaderStyle}>
            {w}
          </div>
        ))}
      </div>
      {Array.from({ length: cells.length / 7 }, (_, r) => (
        <div key={r} role="row">
          {cells.slice(r * 7, r * 7 + 7).map((c, i) => {
            const key = `${r}-${i}`
            if (c.day === null || c.iso === null) {
              return <div key={key} role="cell" aria-hidden="true" style={dayCellStyle} />
            }
            const entriesForDay = byDay.get(c.day) ?? []
            const isSelected = c.iso === selected
            return (
              <button
                key={key}
                type="button"
                role="cell"
                aria-label={String(c.day)}
                aria-pressed={isSelected}
                onClick={() => onSelect(c.iso!)}
                style={
                  {
                    ...dayCellStyle,
                    background: isSelected ? 'var(--accent)' : entriesForDay.length ? 'color-mix(in oklab, var(--accent) 18%, var(--paper-deep))' : 'var(--paper-deep)',
                    color: isSelected ? 'var(--paper)' : 'var(--ink)',
                  } as CSSProperties
                }
              >
                <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'calc(2px * var(--sf))' }}>
                  <span>{c.day}</span>
                  {entriesForDay.length > 0 && <span aria-hidden="true">●</span>}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

export function App() {
  const [state, setState] = useState<SymptomState>(() => loadState())
  const [tab, setTab] = useState<Tab>('Log')
  const [name, setName] = useState('')
  const [severity, setSeverity] = useState('3')
  const [note, setNote] = useState('')
  const [formDate, setFormDate] = useState<string | null>(isoToday())
  const [error, setError] = useState<string | null>(null)
  const [calDate, setCalDate] = useState<string | null>(isoToday())
  const [year, setYear] = useState<number>(() => new Date().getFullYear())
  const [copied, setCopied] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const clipboard = useClipboard()

  const entries = state.entries

  function commit(next: SymptomState) {
    setState(next)
    saveState(next)
  }

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return setError('Type a symptom name first')
    const sev = Number(severity)
    if (!Number.isFinite(sev) || sev < 1 || sev > 5) return setError('Pick a severity from 1 to 5')
    const date = formDate ?? isoToday()
    if (!fromISODate(date)) return setError('Pick a valid date')
    const entry: SymptomEntry = {
      id: makeId(),
      date,
      name: trimmed,
      severity: sev,
      note: note.trim() ? note.trim() : undefined,
      createdAt: Date.now(),
    }
    commit({ entries: [entry, ...entries] })
    setName('')
    setNote('')
    setSeverity('3')
    setError(null)
    setFormOpen(false)
  }

  function removeEntry(id: string) {
    commit({ entries: entries.filter((e) => e.id !== id) })
  }

  const dates = useMemo(() => entries.map((e) => e.date), [entries])
  const streak = useMemo(() => computeStreaks(dates, { today: isoToday() }), [dates])
  const avgSeverity = useMemo(() => {
    if (entries.length === 0) return 0
    const sum = entries.reduce((acc, e) => acc + e.severity, 0)
    return Math.round((sum / entries.length) * 10) / 10
  }, [entries])

  const heatmapData = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) map.set(e.date, (map.get(e.date) ?? 0) + 1)
    const out: { date: string; value: number }[] = []
    const start = new Date(year, 0, 1)
    for (let i = 0; i < 366; i++) {
      const iso = toISODate(start)
      out.push({ date: iso, value: map.get(iso) ?? 0 })
      start.setDate(start.getDate() + 1)
    }
    return out
  }, [entries, year])

  const chartData = useMemo(() => {
    const today = new Date()
    const points: { label: string; value: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i)
      const iso = toISODate(d)
      const day = entries.filter((e) => e.date === iso)
      const label = `${d.getMonth() + 1}/${d.getDate()}`
      points.push({
        label,
        value: day.length ? Math.round((day.reduce((a, e) => a + e.severity, 0) / day.length) * 10) / 10 : 0,
      })
    }
    return points
  }, [entries])

  const dayEntries = useMemo(() => {
    if (!calDate) return []
    return entries.filter((e) => e.date === calDate)
  }, [entries, calDate])

  const calendarLabel = calDate ? (fromISODate(calDate)?.toDateString() ?? calDate) : 'Pick a date'

  const csv = useMemo(() => {
    const header = 'Date,Symptom,Severity'
    const lines = entries.map((e) => `${e.date},${e.name},${e.severity}`)
    return [header, ...lines].join('\n')
  }, [entries])

  const backupJSON = useMemo(() => {
    return exportBackup({
      appId: 'lacuna.symptom-tracker',
      version: 1,
      records: entries.map((e) => ({
        id: e.id,
        data: { date: e.date, name: e.name, severity: e.severity, note: e.note },
        createdAt: e.createdAt,
        updatedAt: e.createdAt,
      })),
    })
  }, [entries])

  const exportOptions = useMemo<ExportOption[]>(() => {
    return [
      {
        id: 'json',
        label: 'JSON',
        mimeType: 'application/json',
        extension: 'json',
        getData: () => backupJSON,
      },
      {
        id: 'csv',
        label: 'CSV',
        mimeType: 'text/csv',
        extension: 'csv',
        getData: () => csv,
      },
    ]
  }, [backupJSON, csv])

  async function copyCsv() {
    setCopied(false)
    try {
      await clipboard.copy(csv)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <AppShell
      name="Symptom Tracker"
      icon="clinic"
      hue="teal"
      category="Healthcare"
      meta={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`}
      status={copied ? 'Copied to clipboard' : 'Saved on this device'}
      side={
        <Rail title="Symptom Tracker" note="Local · no network" chips={['Log', 'Calendar', 'Trends']} />
      }
    >
      <div role="tablist" aria-label="View" style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            style={tabButtonStyle(tab === t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Log' && (
        <Card mono="New" title="Log a symptom">
          {formOpen ? (
            <Stack>
              <FormGrid>
                <TextInput label="Symptom name" value={name} onChange={setName} error={error} placeholder="e.g. Headache" />
                <Select label="Severity" value={severity} onChange={setSeverity} options={SEVERITY_OPTIONS} />
                <TextInput label="Date" value={formDate ?? ''} onChange={(v) => setFormDate(v)} hint="YYYY-MM-DD" />
                <TextInput label="Note" value={note} onChange={setNote} placeholder="Optional detail" />
              </FormGrid>
              <Actions>
                <Button kind="primary" onClick={save}>
                  Save
                </Button>
                <Button kind="ghost" onClick={() => setFormOpen(false)}>
                  Close
                </Button>
              </Actions>
            </Stack>
          ) : (
            <Button kind="primary" onClick={() => setFormOpen(true)}>
              Add symptom
            </Button>
          )}
        </Card>
      )}

      {tab === 'Log' && (
        <Card mono={`${entries.length} saved`} title="History">
          {entries.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No symptoms logged yet"
              detail="Log your first symptom to start tracking."
              actionLabel="Use Add symptom above"
            />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="History">
              {entries.map((e) => (
                <li key={e.id} style={detailDayStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                    <Tag accent={e.date === isoToday()}>{e.date}</Tag>
                    <span>
                      {e.name}
                      {e.note ? ` — ${e.note}` : ''}
                    </span>
                    <span>Severity: {e.severity}</span>
                  </span>
                  <Button kind="ghost" onClick={() => removeEntry(e.id)}>
                    Delete {e.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'Calendar' && (
        <Card mono="Calendar" title="Symptoms by day">
          <Stack>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
              <Button
                kind="ghost"
                ariaLabel="Previous month"
                onClick={() => {
                  if (!calDate) return
                  const d = fromISODate(calDate)
                  if (!d) return
                  setCalDate(toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)))
                }}
              >
                Prev month
              </Button>
              <Tag>{calendarLabel}</Tag>
              <Button
                kind="ghost"
                ariaLabel="Next month"
                onClick={() => {
                  if (!calDate) return
                  const d = fromISODate(calDate)
                  if (!d) return
                  setCalDate(toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 1)))
                }}
              >
                Next month
              </Button>
              <Button kind="ghost" ariaLabel="Today" onClick={() => setCalDate(isoToday())}>
                Today
              </Button>
            </div>
            <MonthGrid date={calDate} entries={entries} onSelect={setCalDate} />
          </Stack>
        </Card>
      )}

      {tab === 'Calendar' && (
        <Card mono="Day detail" title="Symptoms on the selected day">
          {dayEntries.length === 0 ? (
            <EmptyState
              mono="Day"
              title="No symptoms on this day"
              detail="Log a symptom for the selected day to see it here."
              actionLabel="Log a symptom"
            />
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }} aria-label="Entries for this day">
              {dayEntries.map((e) => (
                <li key={e.id} style={detailDayStyle}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                    <span>{e.name}</span>
                    {e.note ? <MonoLabel>{e.note}</MonoLabel> : null}
                    <span>Severity: {e.severity}</span>
                  </span>
                  <Button kind="ghost" onClick={() => removeEntry(e.id)}>
                    Delete {e.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'Trends' && (
        <Stack>
          <Card mono="Overview" title="Tracking summary">
            <KpiRow>
              <Kpi value={String(entries.length)} label="Entries" />
              <Kpi value={`${streak.current}`} label="Current streak" accent />
              <Kpi value={String(streak.longest)} label="Longest streak" />
              <Kpi value={String(avgSeverity)} label="Avg severity" />
            </KpiRow>
            <SectionLabel>Streak</SectionLabel>
            <div style={{ marginTop: 'calc(4px * var(--sf))' }}>
              <Title size="lg" as="h3">
                Current streak: {streak.current} days
              </Title>
            </div>
          </Card>
          <Card mono="Last 30 days" title="Average severity">
            <Chart
              type="line"
              data={chartData}
              title="Average severity by day"
              ariaLabel="Average severity by day"
              width={640}
              height={220}
            />
          </Card>
          <Card mono={`${year} overview`} title="Symptom days">
            <Stack>
              <Heatmap data={heatmapData} year={year} label={`${year} symptom days`} />
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                <Button kind="ghost" ariaLabel="Previous year" onClick={() => setYear((y) => y - 1)}>
                  Prev year
                </Button>
                <Button kind="ghost" ariaLabel="Next year" onClick={() => setYear((y) => y + 1)}>
                  Next year
                </Button>
              </div>
            </Stack>
          </Card>
        </Stack>
      )}

      <Card mono="Backup" title="Export data">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
          <ExportMenu options={exportOptions} fileName="symptom-tracker-backup" ariaLabel="Export" />
          <Button kind="secondary" onClick={() => void copyCsv()}>
            {copied ? 'Copied CSV' : 'Export CSV'}
          </Button>
        </div>
      </Card>
    </AppShell>
  )
}
