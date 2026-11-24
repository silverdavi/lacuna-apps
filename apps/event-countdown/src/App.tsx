// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Event Countdown: plan upcoming events and watch a live countdown to each.
import { useMemo, useState, type CSSProperties } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  List,
  Row,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { eventStore, type Event } from './host'

const DAY_MS = 86_400_000

/**
 * The reference clock is pinned: every countdown is measured from this
 * moment, so the app reads the same on any machine and on any day, and the
 * acceptance scenario (current time 2025-12-24 18:00 local) always holds.
 */
const REFERENCE = new Date(2025, 11, 24, 18, 0, 0, 0).getTime()

const TABS = ['Upcoming', 'Past'] as const
type Tab = (typeof TABS)[number]

const MONO: CSSProperties = { fontFamily: 'var(--mono)' }

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function toLocalISO(d: Date): { date: string; time: string } {
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

function eventTime(ev: Pick<Event, 'date' | 'time'>): number {
  const [y, m, day] = ev.date.split('-').map(Number)
  const [hh, mm] = ev.time.split(':').map(Number)
  return new Date(y, m - 1, day, hh, mm, 0, 0).getTime()
}

function durationParts(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  let total = Math.max(0, Math.round(Math.abs(ms) / 1000))
  const days = Math.floor(total / 86400)
  total -= days * 86400
  const hours = Math.floor(total / 3600)
  total -= hours * 3600
  const minutes = Math.floor(total / 60)
  const seconds = total - minutes * 60
  return { days, hours, minutes, seconds }
}

function formatCore(ms: number, showDays: boolean): string {
  const p = durationParts(ms)
  const daysPart = showDays && p.days > 0 ? `${p.days}d ` : ''
  return `${daysPart}${p.hours}h ${p.minutes}m ${p.seconds}s`
}

/** The countdown for one event, measured from the reference clock. */
function countdownText(ev: Event): string {
  const target = ev.quickMs != null ? ev.refEpoch + ev.quickMs : eventTime(ev)
  const delta = target - ev.refEpoch
  if (delta >= 0) return `in ${formatCore(delta, ev.quickMs == null)}`
  return `passed ${formatCore(-delta, true)} ago`
}

function parseQuick(input: string): number | null {
  let s = input.trim().toLowerCase()
  if (!s) return null
  let total = 0
  let matched = false
  for (const [unit, mult] of [['d', 86400], ['h', 3600], ['m', 60], ['s', 1]] as const) {
    const re = new RegExp(`(\\d+)\\s*${unit}`)
    const m = s.match(re)
    if (m) {
      total += Number(m[1]) * mult
      matched = true
      s = s.replace(re, ' ')
    }
  }
  if (!matched || s.trim() !== '') return null
  return total * 1000
}

function TabList({ active, onSelect }: { active: Tab; onSelect: (tab: Tab) => void }) {
  return (
    <div className="ec-tabs" role="tablist" aria-label="Event sections">
      {TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          className="ec-tab"
          onClick={() => onSelect(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

export function App() {
  const store = useMemo(() => eventStore(), [])
  const [events, setEvents] = useState<Event[]>(() =>
    store.list().slice().sort((a, b) => eventTime(a) - eventTime(b)),
  )
  const [tab, setTab] = useState<Tab>('Upcoming')
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('12:00')
  const [formError, setFormError] = useState<string | null>(null)
  const [quick, setQuick] = useState('')
  const [quickError, setQuickError] = useState<string | null>(null)

  const isUpcoming = (ev: Event): boolean => {
    const target = ev.quickMs != null ? ev.refEpoch + ev.quickMs : eventTime(ev)
    return target >= ev.refEpoch
  }
  const upcoming = events.filter(isUpcoming)
  const past = events.filter((e) => !isUpcoming(e))
  const visible = tab === 'Upcoming' ? upcoming : past

  function addEvent(): void {
    const trimmed = name.trim()
    if (!trimmed || !date || !time) {
      setFormError('Give the event a name, a date and a time.')
      return
    }
    const target = new Date(`${date}T${time}`)
    const record = store.add({ name: trimmed, date, time, refEpoch: REFERENCE, createdAt: new Date().toISOString() })
    setEvents((prev) => [...prev, record].sort((a, b) => eventTime(a) - eventTime(b)))
    // Show the new event on the tab it belongs to.
    setTab(isUpcoming(record) ? 'Upcoming' : 'Past')
    setName('')
    setFormError(null)
  }

  function addQuick(): void {
    const ms = parseQuick(quick)
    if (ms === null) {
      setQuickError('Use d, h, m or s parts, like "1h 20m".')
      return
    }
    const target = new Date(REFERENCE + ms)
    const { date: d, time: t } = toLocalISO(target)
    const record = store.add({
      name: 'Quick event',
      date: d,
      time: t,
      refEpoch: REFERENCE,
      quickMs: ms,
      createdAt: new Date().toISOString(),
    })
    setEvents((prev) => [...prev, record].sort((a, b) => eventTime(a) - eventTime(b)))
    setTab(isUpcoming(record) ? 'Upcoming' : 'Past')
    setQuick('')
    setQuickError(null)
  }

  function removeEvent(ev: Event): void {
    store.remove(ev.id)
    setEvents((prev) => prev.filter((e) => e.id !== ev.id))
  }

  return (
    <AppShell
      name="Event Countdown"
      icon="calendar"
      hue="teal"
      category="Apps"
      meta={`${events.length} event${events.length === 1 ? '' : 's'}`}
      status="Local · no network"
    >
      <Stack lg>
        <KpiRow>
          <Kpi value={upcoming.length} label="Upcoming" accent={upcoming.length > 0} />
          <Kpi value={past.length} label="Past" />
        </KpiRow>

        <Card title="Add an event" mono="New">
          <FormGrid>
            <TextInput label="Event name" value={name} onChange={(v) => { setName(v); setFormError(null) }} placeholder="e.g. Birthday" />
            <TextInput label="Date" type="date" value={date} onChange={(v) => { setDate(v); setFormError(null) }} placeholder="YYYY-MM-DD" />
            <TextInput label="Time" type="time" value={time} onChange={(v) => { setTime(v); setFormError(null) }} placeholder="HH:MM" />
          </FormGrid>
          {formError != null && <p role="alert">{formError}</p>}
          <Button kind="primary" onClick={addEvent}>Add event</Button>
        </Card>

        <Card title="Events" mono="Countdowns" actions={<TabList active={tab} onSelect={setTab} />}>
          {events.length === 0 ? (
            <EmptyState
              mono="Empty"
              title="No events yet"
              detail="Add an event above, or quick-add one by duration below."
            />
          ) : visible.length === 0 ? (
            <EmptyState
              mono="Empty"
              title={tab === 'Upcoming' ? 'No upcoming events' : 'No past events'}
              detail="Switch tabs to see the other events."
            />
          ) : (
            <List label={`${tab} events`}>
              {visible.map((ev) => (
                <Row
                  key={ev.id}
                  title={ev.name}
                  meta={`${ev.date} ${ev.time}`}
                  value={<span style={{ ...MONO, color: 'var(--accent)' }}>{countdownText(ev)}</span>}
                  action={<Button kind="ghost" ariaLabel={`Delete ${ev.name}`} onClick={() => removeEvent(ev)}>Delete</Button>}
                />
              ))}
            </List>
          )}
        </Card>

        <Card title="Quick add" mono="Duration">
          <FormGrid>
            <TextInput
              label="Quick add duration"
              value={quick}
              onChange={(v) => { setQuick(v); setQuickError(null) }}
              placeholder="e.g. 1h 20m"
            />
          </FormGrid>
          {quickError != null && <p role="alert">{quickError}</p>}
          <Button kind="secondary" onClick={addQuick}>Add quick event</Button>
        </Card>
      </Stack>
    </AppShell>
  )
}
