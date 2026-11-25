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
  List,
  Rail,
  Row,
  Select,
  Stack,
  Tag,
  TextInput,
  Title,
} from '@lacuna/ui'
import { Heatmap } from '@lacuna/heatmap'
import { Chart } from '@lacuna/chart'
import { toCsv } from '@lacuna/csv-parse'
import { computeStreaks } from '@lacuna/streak-calc'
import { toISODate, fromISODate, addDays } from '@lacuna/date-math'
import { loadState, saveState, makeId } from './host'
import type { SymptomEntry, SymptomState } from './host'

const TABS = ['Log', 'Calendar', 'Trends'] as const
type Tab = (typeof TABS)[number]

const SEVERITY_OPTIONS = ['1', '2', '3', '4', '5']

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const dayCellStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '1 / 1',
  border: 'none',
  borderRadius: 'calc(2px * var(--sf))',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  cursor: 'pointer',
  boxShadow: 'inset 0 0 0 calc(1px * var(--sf)) var(--ui-line2)',
}

function isoToday(): string {
  return toISODate(new Date())
}

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

function AppTabs({ tab, onSelect }: { tab: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div role="tablist" aria-label="Views" className="lc-tabs">
      {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`lc-tab${tab === t ? ' active' : ''}`}
            style={{ color: 'var(--ink-80)' }}
            onClick={() => onSelect(t)}
          >
          {t}
        </button>
      ))}
    </div>
  )
}

function MonthGrid({ date, entries, onSelect }: { date: string | null; entries: SymptomEntry[]; onSelect: (iso: string) => void }) {
  const { cells, byDay, monthLabel } = monthGrid(date, entries)
  const selected = date
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7))
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(2px * var(--sf))' }}>
      <div style={{ gridRow: '1', gridColumn: '1 / -1' }} aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>
            {w}
          </div>
        ))}
      </div>
      {rows.map((row, r) =>
        row.map((c, i) => {
          const key = `${r}-${i}`
          if (c.day === null || c.iso === null) {
            return <div key={key} aria-hidden="true" />
          }
          const entriesForDay = byDay.get(c.day) ?? []
          const isSelected = c.iso === selected
          return (
            <button
              key={key}
              type="button"
              aria-label={String(c.day)}
              aria-pressed={isSelected}
              onClick={() => onSelect(c.iso!)}
              style={
                {
                  ...dayCellStyle,
                   background: isSelected ? 'var(--accent)' : entriesForDay.length ? 'var(--accent-soft)' : 'var(--paper-deep)',
                   color: isSelected ? 'var(--on-accent)' : 'var(--ink)',
                } as CSSProperties
              }
            >
              {c.day}
            </button>
          )
        }),
      )}
    </div>
  )
}

export function App() {
  const [state, setState] = useState<SymptomState>(() => loadState())
  const [tab, setTab] = useState<Tab>('Log')
  const [name, setName] = useState('')
  const [severity, setSeverity] = useState('3')
  const [note, setNote] = useState('')
  const [formDate, setFormDate] = useState<string>(isoToday())
  const [nameError, setNameError] = useState<string | null>(null)
  const [dateError, setDateError] = useState<string | null>(null)
  const [calDate, setCalDate] = useState<string>(isoToday())
  const [year, setYear] = useState<number>(() => new Date().getFullYear())
  const [formOpen, setFormOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const entries = state.entries

  function commit(next: SymptomState) {
    setState(next)
    saveState(next)
  }

  function save() {
    const trimmed = name.trim()
    if (!trimmed) {
      setNameError('Type a symptom name first')
      return
    }
    setNameError(null)
    if (!fromISODate(formDate)) {
      setDateError('Pick a date in YYYY-MM-DD form')
      return
    }
    setDateError(null)
    const entry: SymptomEntry = {
      id: makeId(),
      date: formDate,
      name: trimmed,
      severity: Number(severity),
      note: note.trim() ? note.trim() : undefined,
      createdAt: Date.now(),
    }
    commit({ entries: [entry, ...entries] })
    setName('')
    setNote('')
    setSeverity('3')
    setFormOpen(false)
  }

  function removeEntry(id: string) {
    commit({ entries: entries.filter((e) => e.id !== id) })
  }

  async function writeClipboard(text: string) {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'fixed'
      ta.style.top = '0'
      ta.style.left = '0'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      if (ok) return
    } catch {
      // fall through to the async clipboard API
    }
    await navigator.clipboard.writeText(text)
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

  const dayEntries = useMemo(() => entries.filter((e) => e.date === calDate), [entries, calDate])

  const calendarLabel = fromISODate(calDate)?.toDateString() ?? 'Pick a date'

  const csv = useMemo(
    () => toCsv([['Date', 'Symptom', 'Severity'], ...entries.map((e) => [e.date, e.name, String(e.severity)])]),
    [entries],
  )

  function moveMonth(delta: number) {
    const d = fromISODate(calDate)
    if (!d) return
    setCalDate(toISODate(new Date(d.getFullYear(), d.getMonth() + delta, 1)))
  }

  async function exportCsv() {
    try {
      await writeClipboard(csv)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
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
      status={copied ? 'Copied to clipboard' : 'Local log'}
      side={<Rail title="Symptom Tracker" note="Daily log · streaks" chips={['Log entries', 'Calendar', 'Heatmap', 'Streak', 'CSV export']} />}
    >
      <AppTabs tab={tab} onSelect={setTab} />

      {tab === 'Log' && (
        <Card mono="New" title="Log a symptom">
          {formOpen ? (
            <Stack>
              <FormGrid>
                <TextInput label="Symptom name" value={name} onChange={setName} error={nameError} placeholder="e.g. Headache" />
                <Select label="Severity" value={severity} onChange={setSeverity} options={SEVERITY_OPTIONS} />
                <TextInput label="Date" value={formDate} onChange={setFormDate} error={dateError} hint="YYYY-MM-DD" />
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
              actionLabel="Press Add symptom"
            />
          ) : (
            <List label="History">
              {entries.map((e) => (
                <Row
                  key={e.id}
                  title={<Tag accent={e.date === isoToday()}>{e.name}</Tag>}
                  meta={`${e.date}${e.note ? ` · ${e.note}` : ''}`}
                  value={`Severity: ${e.severity}`}
                  action={
                    <Button kind="ghost" onClick={() => removeEntry(e.id)}>
                      Delete {e.name}
                    </Button>
                  }
                />
              ))}
            </List>
          )}
        </Card>
      )}

      {tab === 'Calendar' && (
        <Card mono="Calendar" title="Symptoms by day">
          <Stack>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' }}>
              <Button kind="ghost" ariaLabel="Previous month" onClick={() => moveMonth(-1)}>
                Prev month
              </Button>
              <Tag accent>{calendarLabel}</Tag>
              <Button kind="ghost" ariaLabel="Next month" onClick={() => moveMonth(1)}>
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
        <div role="region" aria-label="Day detail">
          <Card mono="Day detail" title="Symptoms on the selected day">
          {dayEntries.length === 0 ? (
            <EmptyState
              mono="Day"
              title="No symptoms on this day"
              detail="Log a symptom for the selected day to see it here."
              actionLabel="Log a symptom"
            />
          ) : (
            <List label="Entries for this day">
              {dayEntries.map((e) => (
                <Row
                  key={e.id}
                  title={e.name}
                  meta={e.note ?? ''}
                  value={`Severity: ${e.severity}`}
                />
              ))}
            </List>
          )}
          </Card>
        </div>
      )}

      {tab === 'Trends' && (
        <Stack>
          <Card mono="Overview" title="Tracking summary">
            <KpiRow>
              <Kpi value={String(entries.length)} label="Entries" />
              <Kpi value={String(streak.current)} label="Current streak" accent />
              <Kpi value={String(streak.longest)} label="Longest streak" />
              <Kpi value={String(avgSeverity)} label="Avg severity" />
            </KpiRow>
            <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
              <Title as="h3">Current streak: {streak.current} days</Title>
            </div>
          </Card>
          <Card mono="Last 30 days" title="Average severity">
            <Chart type="line" data={chartData} title="Average severity by day" ariaLabel="Average severity by day" width={640} height={220} />
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
          <Button kind="secondary" onClick={() => void exportCsv()}>
            {copied ? 'Copied CSV' : 'Export CSV'}
          </Button>
          <Tag>{entries.length ? 'CSV ready' : 'Nothing to export'}</Tag>
        </div>
      </Card>
    </AppShell>
  )
}
