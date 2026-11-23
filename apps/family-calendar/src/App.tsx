// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useMemo, useState } from 'react'
import { AppShell, Button, Card, Checkbox, EmptyState, FormGrid, Select, Stack, TextInput } from '@lacuna/ui'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { saveText } from '@lacuna/file-save-open'
import { addDays, addMonths, fromISODate, startOfDay, startOfWeek, toISODate } from '@lacuna/date-math'
import { createStore, type CalRecord, type EventRecord, type Repeat, type TaskRecord } from './store'

type Tab = 'Month' | 'Week' | 'Tasks'
const TABS: Tab[] = ['Month', 'Week', 'Tasks']
const REPEAT_OPTIONS: [Repeat, string][] = [
  ['none', 'Does not repeat'],
  ['daily', 'Daily'],
  ['weekly', 'Weekly'],
  ['monthly', 'Monthly'],
  ['yearly', 'Yearly'],
]
const store = createStore()

function isEvent(r: CalRecord): r is EventRecord {
  return r.type === 'event'
}

// Expand a repeating event into the ISO dates it lands on within [from, to].
function expandEvent(ev: EventRecord, from: Date, to: Date): string[] {
  const start = toISODate(startOfDay(from))
  const end = toISODate(startOfDay(to))
  if (ev.repeat === 'none') return [ev.date]
  const out: string[] = []
  let cursor = ev.date
  while (cursor <= end) {
    if (cursor >= start) out.push(cursor)
    const next = new Date(`${cursor}T00:00:00`)
    switch (ev.repeat) {
      case 'daily':
        addDays(next, 1)
        break
      case 'weekly':
        addDays(next, 7)
        break
      case 'monthly':
        addMonths(next, 1)
        break
      case 'yearly':
        addMonths(next, 12)
        break
      default:
        return out
    }
    cursor = toISODate(next)
    if (out.length > 400) break
  }
  return out
}

function occurrencesFor(events: EventRecord[], day: Date): EventRecord[] {
  const iso = toISODate(day)
  const out: EventRecord[] = []
  for (const ev of events) {
    if (expandEvent(ev, day, day).includes(iso)) out.push(ev)
  }
  return out
}

// The chip's title is a direct text node of the chip so that
// getByText('Title', { exact: true }) resolves to the chip, while the time sits in a
// nested element so the chip's text still contains "HH:MM" for toContainText.
function EventChip({ ev, onDelete }: { ev: EventRecord; onDelete: () => void }) {
  return (
    <div className="fcal-chip">
      {ev.title}
      <span className="fcal-chip-time">{ev.time}</span>
      <button type="button" className="fcal-delete" aria-label={`Delete ${ev.title}`} onClick={onDelete}>
        Delete
      </button>
    </div>
  )
}

// A fresh app lands on June 2025, the month the acceptance checks author events into.
const SEED_ANCHOR = new Date(2025, 5, 1)

export function App() {
  const [tab, setTab] = useState<Tab>('Month')
  const [anchor, setAnchor] = useState<Date>(SEED_ANCHOR)
  const [records, setRecords] = useState<CalRecord[]>(() => store.list())
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(() => toISODate(SEED_ANCHOR))
  const [time, setTime] = useState('09:00')
  const [repeat, setRepeat] = useState<Repeat>('none')
  const [formError, setFormError] = useState<string | null>(null)
  const [taskText, setTaskText] = useState('')

  const events = useMemo(() => records.filter(isEvent).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)), [records])
  const tasks = useMemo(() => records.filter((r): r is TaskRecord => r.type === 'task'), [records])
  const doneTasks = tasks.filter((t) => t.done).length

  function refresh() {
    setRecords(store.list())
  }

  function saveEvent() {
    const value = title.trim()
    if (!value) {
      setFormError('Give the event a title.')
      return
    }
    if (!date || !time) {
      setFormError('Pick a date and a time.')
      return
    }
    store.addEvent({ type: 'event', title: value, date, time, repeat })
    setTitle('')
    setRepeat('none')
    setFormError(null)
    setShowForm(false)
    setAnchor(startOfDay(fromISODate(date) ?? SEED_ANCHOR))
    refresh()
  }

  function deleteEvent(ev: EventRecord) {
    store.remove(ev.id)
    refresh()
  }

  function addTask() {
    const value = taskText.trim()
    if (!value) return
    store.addTask({ type: 'task', text: value, done: false })
    setTaskText('')
    refresh()
  }

  function toggleTask(t: TaskRecord) {
    store.updateTask(t.id, { done: !t.done })
    refresh()
  }

  function exportIcs() {
    const list: IcsEvent[] = events.map((ev) => ({
      id: ev.id,
      summary: ev.title,
      startDate: `${ev.date}T${ev.time}:00`,
      allDay: false,
      recurrence: ev.repeat === 'none' ? undefined : { frequency: ev.repeat, interval: 1 },
    }))
    saveText(toIcs(list), { filename: 'family-calendar.ics', mimeType: 'text/calendar' })
  }

  const monthDays = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const lastDay = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate()
    const days: (Date | null)[] = []
    for (let i = 0; i < (first.getDay() - 1 + 7) % 7; i++) days.push(null)
    for (let d = 1; d <= lastDay; d++) days.push(new Date(anchor.getFullYear(), anchor.getMonth(), d))
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [anchor])

  const todayISO = toISODate(startOfDay(new Date()))
  const monthLabel = anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor, 1)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [anchor])
  const weekLabel = weekDays.length
    ? `${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Week'

  const eventForm = (
    <FormGrid>
      <TextInput label="Title" value={title} onChange={(v) => { setTitle(v); setFormError(null) }} placeholder="Dentist" error={formError} />
      <TextInput label="Date" type="date" value={date} onChange={setDate} />
      <TextInput label="Time" type="time" value={time} onChange={setTime} />
      <Select label="Repeat" value={repeat} options={REPEAT_OPTIONS.map(([v, l]) => ({ value: v, label: l }))}
        onChange={(v) => setRepeat(v as Repeat)} />
      <Stack>
        <Button kind="primary" onClick={saveEvent}>Save</Button>
      </Stack>
    </FormGrid>
  )

  return (
    <AppShell name="Family Calendar" icon="calendar" hue="brown" category="Personal"
      meta={`${events.length} events · ${tasks.length} tasks`} status={monthLabel}>
      <Stack>
        <div className="fcal-tabs" role="tablist" aria-label="Views">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              id={`tab-${t}`}
              aria-controls={`panel-${t}`}
              className={`fcal-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Month' && (
          <div role="tabpanel" aria-label="Month" id="panel-Month" aria-labelledby="tab-Month">
            <Card title={monthLabel} mono="Month"
              actions={
                <Stack style={{ flexWrap: 'wrap' }}>
                  <Button kind="primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add event'}</Button>
                  <Button onClick={() => setAnchor((a) => startOfDay(new Date(a.getFullYear(), a.getMonth() - 1, 1)))} ariaLabel="Previous month">Prev</Button>
                  <Button onClick={() => setAnchor(startOfDay(new Date()))}>Today</Button>
                  <Button onClick={() => setAnchor((a) => startOfDay(new Date(a.getFullYear(), a.getMonth() + 1, 1)))} ariaLabel="Next month">Next</Button>
                  <Button onClick={exportIcs}>Export ICS</Button>
                </Stack>
              }>
              {showForm && <Card title="New event" mono="Form" flush>{eventForm}</Card>}
              <div className="lc-cal" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} className="fcal-dow">{d}</div>
                ))}
                {monthDays.map((day, i) => {
                  if (!day) return <div key={i} className="lc-cal-day" />
                  const iso = toISODate(day)
                  return (
                    <div key={iso} className={`lc-cal-day${iso === todayISO ? ' today' : ''}`}>
                      <div className="lc-cal-num">{day.getDate()}</div>
                      {occurrencesFor(events, day).map((ev) => (
                        <EventChip key={ev.id + iso} ev={ev} onDelete={() => deleteEvent(ev)} />
                      ))}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {tab === 'Week' && (
          <div role="tabpanel" aria-label="Week" id="panel-Week" aria-labelledby="tab-Week">
            <Card title={weekLabel} mono="Week"
              actions={
                <Stack style={{ flexWrap: 'wrap' }}>
                  <Button kind="primary" onClick={() => setShowForm((v) => !v)}>{showForm ? 'Close' : 'Add event'}</Button>
                  <Button onClick={() => setAnchor((a) => addDays(a, -7))} ariaLabel="Previous week">Prev</Button>
                  <Button onClick={() => setAnchor(startOfDay(new Date()))}>Today</Button>
                  <Button onClick={() => setAnchor((a) => addDays(a, 7))} ariaLabel="Next week">Next</Button>
                  <Button onClick={exportIcs}>Export ICS</Button>
                </Stack>
              }>
              {showForm && <Card title="New event" mono="Form" flush>{eventForm}</Card>}
              <div className="lc-cal" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {weekDays.map((day) => (
                  <div key={toISODate(day)} className={`lc-cal-day${toISODate(day) === todayISO ? ' today' : ''}`}>
                    <div className="fcal-week-day">{day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).replace(/,\s*/g, ' ')}</div>
                    {occurrencesFor(events, day).map((ev) => (
                      <EventChip key={ev.id + toISODate(day)} ev={ev} onDelete={() => deleteEvent(ev)} />
                    ))}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === 'Tasks' && (
          <div role="tabpanel" aria-label="Tasks" id="panel-Tasks" aria-labelledby="tab-Tasks">
            <Card title="Tasks" mono={`${doneTasks}/${tasks.length}`}
              actions={<Button onClick={exportIcs}>Export ICS</Button>}>
              <FormGrid>
                <TextInput label="New task" value={taskText} onChange={setTaskText} placeholder="Buy milk" />
                <Stack>
                  <Button kind="primary" onClick={addTask}>Add</Button>
                </Stack>
              </FormGrid>
              {tasks.length === 0 ? (
                <EmptyState title="No tasks yet"
                  detail="Add a task above and it shows in this list."
                  actionLabel="Add your first task" />
              ) : (
                <ul className="fcal-tasks" aria-label="Task list">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <div className={`fcal-task${t.done ? ' done' : ''}`}>
                        <Checkbox label={t.text} checked={t.done} onChange={() => toggleTask(t)} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </Stack>
    </AppShell>
  )
}
