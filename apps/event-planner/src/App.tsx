// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useRef, useState, type SyntheticEvent } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Select,
  TextInput,
} from '@lacuna/ui'
import { addDays, fromISODate, startOfMonth, toISODate } from '@lacuna/date-math'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { isRecurring, type RecurrenceRule } from '@lacuna/recurrence'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  addEvent,
  addTask,
  listEvents,
  listTasks,
  removeEvent,
  removeTask,
  updateTask,
  type EvEvent,
  type EvTask,
} from './host'
import './app.css'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DAY_MS = 24 * 60 * 60 * 1000
const GUTTER_MS = 140
const PLOT_W = 1000

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function ruleOf(e: EvEvent): RecurrenceRule | null {
  if (!e.recurrence) return null
  return {
    frequency: e.recurrence.frequency,
    interval: e.recurrence.interval,
    startDate: e.date,
    endDate: e.recurrence.until,
    maxOccurrences: e.recurrence.maxOccurrences,
  }
}

function eventsOnDay(list: EvEvent[], iso: string): EvEvent[] {
  const out: EvEvent[] = []
  for (const e of list) {
    if (e.date === iso) out.push(e)
    else {
      const r = ruleOf(e)
      if (r && e.date < iso && isRecurring(r, iso)) out.push(e)
    }
  }
  return out
}

function occurrencesInMonth(list: EvEvent[], year: number, month: number): Map<string, EvEvent[]> {
  const out = new Map<string, EvEvent[]>()
  const first = startOfMonth(new Date(year, month, 1))
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  for (let d = 0; d < daysInMonth; d++) {
    const iso = toISODate(addDays(first, d))
    const hits = eventsOnDay(list, iso)
    if (hits.length > 0) out.set(iso, hits)
  }
  return out
}

function monthEventsIcs(list: EvEvent[], year: number, month: number): string {
  const byDay = occurrencesInMonth(list, year, month)
  const out: IcsEvent[] = []
  const seen = new Set<string>()
  for (const [iso, hits] of [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
    for (const e of hits) {
      const uid = `${e.id}:${e.date === iso ? 'origin' : iso}`
      if (seen.has(uid)) continue
      seen.add(uid)
      const r = ruleOf(e)
      if (r && e.date !== iso) continue
      const recurrence =
        e.date === iso && e.recurrence
          ? {
              frequency: e.recurrence.frequency,
              interval: e.recurrence.interval,
              maxOccurrences: e.recurrence.maxOccurrences,
              endDate: e.recurrence.until,
            }
          : undefined
      out.push({
        id: uid,
        summary: e.title,
        description: e.notes || undefined,
        startDate: e.date === iso ? `${iso}T${e.start}:00` : iso,
        endDate: e.date === iso ? `${iso}T${e.end}:00` : undefined,
        allDay: e.date !== iso,
        recurrence,
      })
    }
  }
  return toIcs(out)
}

function taskIcs(tasks: EvTask[]): string {
  const out: IcsEvent[] = tasks.map((t) => ({
    id: t.id,
    summary: t.name,
    description: [t.owner ? `Owner: ${t.owner}` : null, t.notes || null].filter(Boolean).join('\n') || undefined,
    startDate: `${t.start}T09:00:00`,
    endDate: `${t.due}T18:00:00`,
    allDay: false,
  }))
  return toIcs(out)
}

function initialViewDate(events: EvEvent[]): Date {
  if (events.length > 0) {
    const earliest = events.reduce((min, e) => (e.date < min ? e.date : min), events[0].date)
    const d = fromISODate(earliest)
    if (d) return new Date(d.getFullYear(), d.getMonth(), 1)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

export function App() {
  const [tab, setTab] = useState<'Events' | 'Timeline'>('Events')
  const [viewDate, setViewDate] = useState(() => initialViewDate(listEvents()))
  const [events, setEvents] = useState<EvEvent[]>(() => listEvents())
  const [tasks, setTasks] = useState<EvTask[]>(() => listTasks())
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthStart = startOfMonth(viewDate)
  const lead = (monthStart.getDay() + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalCells = Math.ceil((lead + daysInMonth) / 7) * 7
  const todayIso = toISODate(new Date())
  const byDay = useMemo(() => occurrencesInMonth(events, year, month), [events, year, month])

  const selected = selectedId ? events.find((e) => e.id === selectedId) ?? null : null

  function refreshEvents(next: EvEvent[]) {
    setEvents(next)
    if (selectedId && !next.some((e) => e.id === selectedId)) setSelectedId(null)
    const last = next[next.length - 1]
    if (last) {
      const d = fromISODate(last.date)
      if (d) setViewDate((v) => (v.getFullYear() === d.getFullYear() && v.getMonth() === d.getMonth()) ? v : new Date(d.getFullYear(), d.getMonth(), 1))
    }
  }

  function deleteEvent(id: string) {
    refreshEvents(events.filter((e) => e.id !== id))
    removeEvent(id)
  }

  function prevMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  }

  function nextMonth() {
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  }

  const exportEvents = useClipboard({ timeoutMs: 1800 })
  const exportTasks = useClipboard({ timeoutMs: 1800 })

  return (
    <AppShell
      name="Event Planner"
      icon="calendar"
      hue="teal"
      category="productivity"
      meta={`${events.length} ${events.length === 1 ? 'event' : 'events'} · ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}
    >
      <div className="ep-tabs" role="tablist" aria-label="Sections">
        {(['Events', 'Timeline'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`ep-tab${tab === t ? ' active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <EventsTab
        key={`${year}-${month}`}
        events={events}
        year={year}
        month={month}
        monthStart={monthStart}
        lead={lead}
        daysInMonth={daysInMonth}
        totalCells={totalCells}
        todayIso={todayIso}
        byDay={byDay}
        onPrev={prevMonth}
        onNext={nextMonth}
        onSelect={(id) => setSelectedId(id)}
        onDelete={deleteEvent}
        onAdd={(input) => refreshEvents([...events, addEvent(input)])}
        onExport={() => void exportEvents.copy(monthEventsIcs(events, year, month))}
        exported={exportEvents.copied}
        active={tab === 'Events'}
      />
      <TimelineTab
        key="timeline"
        tasks={tasks}
        onAdd={(input) => setTasks([...tasks, addTask(input)])}
        onResize={(id, due) => {
          const next = tasks.map((t) => (t.id === id ? updateTask(id, { due }) ?? t : t))
          setTasks(next)
        }}
        onDelete={(id) => setTasks(tasks.filter((t) => t.id !== id))}
        onExport={() => void exportTasks.copy(taskIcs(tasks))}
        exported={exportTasks.copied}
        active={tab === 'Timeline'}
      />

      {selected ? (
        <div className="ep-overlay">
          <div className="ep-dialog" role="dialog" aria-modal="true" aria-label={selected.title}>
            <h2>{selected.title}</h2>
            <div className="ep-detail">
              <div>
                {selected.start}–{selected.end}
              </div>
              {selected.recurrence ? <div>Repeats {selected.recurrence.frequency}</div> : null}
              {selected.notes ? <div className="ep-dl">{selected.notes}</div> : null}
            </div>
            <Actions>
              <PrimaryButton onClick={() => deleteEvent(selected.id)}>Delete</PrimaryButton>
            </Actions>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}

interface EventsTabProps {
  events: EvEvent[]
  year: number
  month: number
  monthStart: Date
  lead: number
  daysInMonth: number
  totalCells: number
  todayIso: string
  byDay: Map<string, EvEvent[]>
  onPrev: () => void
  onNext: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onAdd: (input: Omit<EvEvent, 'id'>) => void
  onExport: () => void
  exported: boolean
  active: boolean
}

function EventsTab({
  events,
  year,
  month,
  monthStart,
  lead,
  daysInMonth,
  totalCells,
  todayIso,
  byDay,
  onPrev,
  onNext,
  onSelect,
  onDelete,
  onAdd,
  onExport,
  exported,
  active,
}: EventsTabProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(toISODate(new Date(year, month, 1)))
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [freq, setFreq] = useState('none')
  const [interval, setInterval] = useState(1)
  const [until, setUntil] = useState('')
  const [count, setCount] = useState('')
  const [error, setError] = useState<string | null>(null)

  function onInterval(v: string) {
    setInterval(Number(v) || 1)
  }

  function save() {
    if (!title.trim()) return setError('Give the event a title')
    if (toMinutes(end) <= toMinutes(start)) return setError('The end time must be after the start')
    const recurrence =
      freq === 'none'
        ? null
        : {
            frequency: freq.toLowerCase() as 'daily' | 'weekly' | 'monthly' | 'yearly',
            interval: Math.max(1, interval),
            until: until || undefined,
            maxOccurrences: count ? Math.max(1, Number(count)) : undefined,
          }
    onAdd({ title: title.trim(), date, start, end, notes: notes.trim(), recurrence })
    setTitle('')
    setNotes('')
    setFreq('none')
    setUntil('')
    setCount('')
    setError(null)
    setFormOpen(false)
  }

  return (
    <div className="ep-panel" data-panel="events">
      <Card title="Calendar" mono={String(year)}>
        <div className="ep-toolbar">
          <div className="ep-nav">
            <Button kind="ghost" ariaLabel="Previous month" onClick={onPrev}>
              ←
            </Button>
            <span className="ep-period">
              {MONTHS[month]} {year}
            </span>
            <Button kind="ghost" ariaLabel="Next month" onClick={onNext}>
              →
            </Button>
          </div>
          {active ? (
            <div className="ep-actions">
              <Button kind="secondary" onClick={() => setFormOpen(true)}>
                New event
              </Button>
              <Button kind="secondary" onClick={onExport}>
                Export ICS
              </Button>
              <span className={exported ? 'ep-saved' : 'ep-saved-idle'} aria-live="polite">
                {exported ? 'Calendar copied' : ''}
              </span>
            </div>
          ) : null}
        </div>
        <div className="ep-calendar" role="table">
          <div className="ep-grid" role="row" aria-hidden>
            {WEEKDAYS.map((w) => (
              <div key={w} className="ep-grid-head">
                {w}
              </div>
            ))}
          </div>
          {Array.from({ length: Math.ceil(totalCells / 7) }, (_, w) => (
            <div key={w} role="row" className="ep-cell-row">
              {Array.from({ length: 7 }, (_, c) => {
                const i = w * 7 + c
                const dayIndex = i - lead + 1
                const inMonth = dayIndex >= 1 && dayIndex <= daysInMonth
                const iso = inMonth ? toISODate(addDays(monthStart, dayIndex - 1)) : ''
                const dayHits = iso ? (byDay.get(iso) ?? []) : []
                return (
                  <div
                    key={i}
                    role="cell"
                    aria-label={iso ? `${MONTHS[month]} ${Number(iso.slice(8, 10))}` : ''}
                    className={`ep-cell${!inMonth ? ' off' : ''}${iso === todayIso ? ' today' : ''}`}
                  >
                    {inMonth ? <span className="ep-cell-date">{dayIndex}</span> : null}
                    <div className="ep-blocks">
                      {dayHits.map((e) => (
                        <button
                          key={e.id + (e.date === iso ? '' : iso)}
                          type="button"
                          className="ep-block"
                          onClick={() => onSelect(e.id)}
                        >
                          {e.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </Card>

      {formOpen ? (
        <Card title="New event">
          <FormGrid>
            <TextInput label="Title" value={title} onChange={setTitle} />
            <TextInput label="Date" type="date" value={date} onChange={setDate} />
            <TextInput label="Start time" type="time" value={start} onChange={setStart} />
            <TextInput label="End time" type="time" value={end} onChange={setEnd} />
            <Select
              label="Recurrence"
              value={freq}
              onChange={setFreq}
              options={[
                { value: 'none', label: 'Does not repeat' },
                { value: 'daily', label: 'Daily' },
                { value: 'Weekly', label: 'Weekly' },
                { value: 'Monthly', label: 'Monthly' },
                { value: 'Yearly', label: 'Yearly' },
              ]}
            />
            {freq !== 'none' ? (
              <>
                <TextInput label="Every (N)" type="number" value={String(interval)} onChange={onInterval} />
                <TextInput label="Until (optional)" type="date" value={until} onChange={setUntil} />
                <TextInput label="Or after N occurrences (optional)" type="number" value={count} onChange={setCount} />
              </>
            ) : null}
            <TextInput label="Notes" value={notes} onChange={setNotes} rows={2} />
          </FormGrid>
          <div className="ep-error-wrap">
            {error ? <div className="ep-error" role="alert">{error}</div> : null}
          </div>
          <Actions>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </Actions>
        </Card>
      ) : null}

      <Card title="This month" mono={`${events.length} total`}>
        {byDay.size === 0 ? (
          <EmptyState
            mono="Empty"
            title="No events this month"
            detail="Create the first one above."
            actionLabel="Add an event"
          />
        ) : (
          [...byDay.entries()]
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .flatMap(([iso, hits]) =>
              hits.map((e) => (
                <div key={e.id + iso} className="ep-row">
                  <span className="ep-row-date">{iso}</span>
                  <span className="ep-row-title">{e.title}</span>
                  <span className="ep-row-time">
                    {e.start}–{e.end}
                  </span>
                  {e.recurrence ? <span className="ep-row-rep">{e.recurrence.frequency}</span> : null}
                  <Button kind="ghost" ariaLabel={`Remove ${e.title}`} onClick={() => onDelete(e.id)}>
                    ×
                  </Button>
                </div>
              )),
            )
        )}
      </Card>
    </div>
  )
}

interface TimelineTabProps {
  tasks: EvTask[]
  onAdd: (input: Omit<EvTask, 'id'>) => void
  onResize: (id: string, due: string) => void
  onDelete: (id: string) => void
  onExport: () => void
  exported: boolean
  active: boolean
}

function timelineBounds(tasks: EvTask[], anchor: Date): { from: Date; days: number } {
  if (tasks.length === 0) {
    const first = startOfMonth(anchor)
    return { from: addDays(first, -7), days: 50 }
  }
  let min = Infinity
  let max = -Infinity
  for (const t of tasks) {
    const s = fromISODate(t.start)!.getTime()
    const d = fromISODate(t.due)!.getTime()
    min = Math.min(min, s)
    max = Math.max(max, d)
  }
  const from = new Date(min)
  const days = Math.max(50, Math.ceil((max - min) / DAY_MS) + 14)
  return { from, days }
}

function TimelineTab({ tasks, onAdd, onResize, onDelete, onExport, exported, active }: TimelineTabProps) {
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [owner, setOwner] = useState('')
  const [start, setStart] = useState(toISODate(new Date()))
  const [due, setDue] = useState(toISODate(addDays(new Date(), 7)))
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const plotRef = useRef<HTMLDivElement | null>(null)

  const { from, days } = useMemo(
    () => timelineBounds(tasks, new Date()),
    [tasks],
  )

  function addDayIndex(delta: number): string {
    return toISODate(addDays(from, delta))
  }

  function dayOf(iso: string): number {
    return Math.round((fromISODate(iso)!.getTime() - from.getTime()) / DAY_MS)
  }

  function save() {
    if (!name.trim()) return setError('Give the task a name')
    if (fromISODate(due)!.getTime() < fromISODate(start)!.getTime())
      return setError('The due date must be on or after the start date')
    onAdd({ name: name.trim(), owner: owner.trim(), start, due, notes: notes.trim() })
    setName('')
    setOwner('')
    setNotes('')
    setError(null)
    setFormOpen(false)
  }

  function startDrag(task: EvTask, ev: SyntheticEvent) {
    ev.preventDefault()
    const plot = plotRef.current
    if (!plot) return
    const rect = plot.getBoundingClientRect()
    const move = (moveEvent: globalThis.MouseEvent) => {
      const x = moveEvent.clientX - rect.left - GUTTER_MS
      const day = Math.max(dayOf(task.start), Math.min(days - 1, Math.round(x / PLOT_W * days)))
      const due = addDayIndex(day)
      if (due !== task.due) onResize(task.id, due)
    }
    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return (
    <div className="ep-panel" data-panel="timeline">
      <Card title="Timeline" mono={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}`}>
        {active ? (
          <div className="ep-actions" style={{ marginBottom: 'calc(12px * var(--sf))' }}>
            <Button kind="secondary" onClick={() => setFormOpen(true)}>
              New task
            </Button>
            <Button kind="secondary" onClick={onExport}>
              Export ICS
            </Button>
            <span className={exported ? 'ep-saved' : 'ep-saved-idle'} aria-live="polite">
              {exported ? 'Tasks copied' : ''}
            </span>
          </div>
        ) : null}
        <div className="ep-gantt" tabIndex={0}>
          <div className="ep-gantt-head" style={{ paddingLeft: GUTTER_MS }}>
            <span>{MONTHS[new Date(from.getTime()).getMonth()].slice(0, 3)} {String(new Date(from.getTime()).getFullYear()).slice(2)}</span>
          </div>
          <div ref={plotRef} className="ep-gantt-plot" style={{ width: GUTTER_MS + PLOT_W }}>
            <div className="ep-gantt-scale" style={{ marginLeft: GUTTER_MS, width: PLOT_W }}>
              {Array.from({ length: days }, (_, i) => {
                if (i % 7 !== 0) return null
                const iso = addDayIndex(i)
                return (
                  <span
                    key={i}
                    className="ep-gantt-tick"
                    style={{ left: `${(i / days) * 100}%` }}
                  >
                    {Number(iso.slice(8, 10))}
                  </span>
                )
              })}
            </div>
            <div className="ep-gantt-grid" style={{ left: GUTTER_MS, right: 0 }}>
              {Array.from({ length: days }, (_, i) => {
                if (i % 7 !== 0) return null
                return (
                  <span
                    key={i}
                    className="ep-gantt-line"
                    style={{ left: `${(i / days) * 100}%` }}
                    aria-hidden
                  />
                )
              })}
            </div>
            {tasks.map((t) => {
              const s = dayOf(t.start)
              const d = Math.max(s, dayOf(t.due))
              const left = `${(s / days) * 100}%`
              const width = `${Math.max(0.5, ((d - s) / days) * 100)}%`
              return (
                <div key={t.id} className="ep-gantt-row">
                  <div className="ep-gantt-label">
                    <span className="ep-gantt-name">{t.name}</span>
                    {t.owner ? <span className="ep-gantt-owner">{t.owner}</span> : null}
                  </div>
                  <div className="ep-gantt-track">
                    <div
                      className="ep-gantt-bar"
                      style={{ left, width }}
                      role="group"
                      aria-label={t.name}
                      title={`${t.name}: ${t.start} → ${t.due}`}
                    >
                      <span className="ep-gantt-bar-label">{t.name}</span>
                      <button
                        type="button"
                        className="ep-gantt-resize"
                        aria-label={`Resize ${t.name} due date`}
                        onMouseDown={(e) => startDrag(t, e)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {tasks.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No tasks yet"
            detail="Add the first one below to start the timeline."
            actionLabel="Add a task"
          />
        ) : null}
      </Card>

      {formOpen ? (
        <Card title="New task">
          <FormGrid>
            <TextInput label="Name" value={name} onChange={setName} />
            <TextInput label="Owner" value={owner} onChange={setOwner} />
            <TextInput label="Start" type="date" value={start} onChange={setStart} />
            <TextInput label="End" type="date" value={due} onChange={setDue} />
            <TextInput label="Notes" value={notes} onChange={setNotes} rows={2} />
          </FormGrid>
          {error ? <div className="ep-error" role="alert">{error}</div> : null}
          <Actions>
            <PrimaryButton onClick={save}>Save</PrimaryButton>
          </Actions>
        </Card>
      ) : null}

      <Card title="Tasks" mono={`${tasks.length} total`}>
        {tasks.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No tasks"
            detail="Tasks added above appear here."
            actionLabel="Add a task"
          />
        ) : (
          tasks.map((t) => (
            <div key={t.id} className="ep-row">
              <span className="ep-row-date">
                {t.start} → {t.due}
              </span>
              <span className="ep-row-title">{t.name}</span>
              {t.owner ? <span className="ep-row-rep">{t.owner}</span> : null}
              <Button kind="ghost" ariaLabel={`Remove ${t.name}`} onClick={() => onDelete(t.id)}>
                ×
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  )
}
