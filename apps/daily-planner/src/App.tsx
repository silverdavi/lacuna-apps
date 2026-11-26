// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useState } from 'react'
import { AppShell, Button, Card, Checkbox, EmptyState, MonoLabel, Rail, Row, SectionLabel, Stack, TextInput } from '@lacuna/ui'
import { toISODate, fromISODate } from '@lacuna/date-math'
import { useClipboard } from '@lacuna/use-clipboard'
import { useHostMock } from './host/mock'
import { monthCells, monthLabel, weekDays, occurrencesByDate, taskDueDates, type CalendarEvent } from './lib/dates'
import { listEvents } from './lib/persistence'
import { eventsToIcs } from './lib/ics'
import type { EventItem, Recurrence, Task } from './lib/types'

type Tab = 'Tasks' | 'Calendar'

function todayISO(): string {
  return toISODate(new Date())
}

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
]

export function App() {
  const { tasks, events, addTask, addEvent, toggleTask, removeTask, removeEvent, error, reset } = useHostMock()
  const { copy, copied } = useClipboard()

  const [tab, setTab] = useState<Tab>('Tasks')
  const [calendarView, setCalendarView] = useState<'Month' | 'Week'>('Month')

  const [taskTitle, setTaskTitle] = useState('')
  const [taskRecurrence, setTaskRecurrence] = useState<Recurrence>('none')

  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [eventTitle, setEventTitle] = useState('')
  const [eventDate, setEventDate] = useState(todayISO())
  const [eventTime, setEventTime] = useState('09:00')
  const [eventRecurrence, setEventRecurrence] = useState<Recurrence>('none')

  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null)
  const [editRecurrence, setEditRecurrence] = useState<Recurrence>('none')

  const [selectedISO, setSelectedISO] = useState<string>(todayISO())
  const [viewMonth, setViewMonth] = useState(() => {
    const evs = listEvents()
    if (evs.length > 0) {
      const latest = evs.reduce((a, b) => (a.date > b.date ? a : b))
      const d = fromISODate(latest.date)
      if (d !== null) return { year: d.getFullYear(), month: d.getMonth() }
    }
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  useEffect(() => {
    document.title = 'Daily Planner'
  }, [])

  const today = todayISO()

  const todayTasks = useMemo(() => tasks.filter((t: Task) => t.due === today), [tasks, today])
  const doneCount = todayTasks.filter((t) => t.done).length
  const total = todayTasks.length

  const monthCellsISO = useMemo(
    () => monthCells(viewMonth.year, viewMonth.month),
    [viewMonth.year, viewMonth.month],
  )

  const byDate = useMemo(
    () => occurrencesByDate(events, monthCellsISO[0], monthCellsISO[monthCellsISO.length - 1]),
    [events, monthCellsISO],
  )
  const dueDates = useMemo(
    () => taskDueDates(tasks, monthCellsISO[0], monthCellsISO[monthCellsISO.length - 1]),
    [tasks, monthCellsISO],
  )

  const week = useMemo(() => weekDays(selectedISO), [selectedISO])
  const weekByDate = useMemo(
    () => occurrencesByDate(events, week[0], week[6]),
    [events, week],
  )

  function shiftMonth(delta: number) {
    setViewMonth((m) => {
      const d = new Date(m.year, m.month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  function submitTask() {
    const title = taskTitle.trim()
    if (title.length === 0) return
    addTask({ title, due: todayISO(), done: false, recurrence: 'none' })
    setTaskTitle('')
  }

  function openEventForm() {
    setEventFormOpen(true)
    setEventTitle('')
    setEventDate(selectedISO)
    setEventTime('09:00')
    setEventRecurrence('none')
  }

  function submitEvent() {
    const title = eventTitle.trim()
    if (title.length === 0) return
    addEvent({ title, date: eventDate, time: eventTime, recurrence: eventRecurrence })
    const d = fromISODate(eventDate)
    if (d !== null) setViewMonth({ year: d.getFullYear(), month: d.getMonth() })
    setSelectedISO(eventDate)
    setEventFormOpen(false)
    setEventTitle('')
  }

  function startEditEvent(event: EventItem) {
    setEditingEvent(event)
    setEditRecurrence(event.recurrence)
  }

  function saveEditEvent() {
    if (editingEvent === null) return
    addEvent({
      title: editingEvent.title,
      date: editingEvent.date,
      time: editingEvent.time,
      recurrence: editRecurrence,
    })
    removeEvent(editingEvent.id)
    setViewMonth({
      year: (fromISODate(editingEvent.date) ?? new Date()).getFullYear(),
      month: (fromISODate(editingEvent.date) ?? new Date()).getMonth(),
    })
    setEditingEvent(null)
  }

  function exportIcs() {
    void copy(eventsToIcs(events))
  }

  return (
    <AppShell
      name="Daily Planner"
      icon="docs"
      hue="gold"
      category="Productivity"
      side={
        <>
          <Rail title="Today" note={`${today}`} chips={['Live totals', 'Task progress']}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13px * var(--tf))' }}>
                <span>Due today</span>
                <span style={{ fontFamily: 'var(--mono)' }}>{doneCount} of {total}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13px * var(--tf))' }}>
                <span>Events</span>
                <span style={{ fontFamily: 'var(--mono)' }}>{events.length}</span>
              </div>
            </div>
          </Rail>
          <Rail title="Export" note="ICS calendar" chips={['Copy .ics', 'Calendar format']}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'calc(13px * var(--tf))' }}>
                <span>All events</span>
                <span style={{ fontFamily: 'var(--mono)' }}>{events.length}</span>
              </div>
            </div>
          </Rail>
        </>
      }
      status={`${total} due · ${events.length} events`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
        <div role="tablist" aria-label="Daily Planner views" style={{ display: 'flex', gap: 'calc(16px * var(--sf))' }}>
          {(['Tasks', 'Calendar'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className="dp-tab"
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(14px * var(--tf))',
                fontWeight: 600,
                color: tab === t ? 'var(--ink)' : 'var(--ink-60)',
                padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))',
                border: 'none',
                background: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${tab === t ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
              }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'Tasks' && (
          <Card title="Tasks" mono={`${doneCount}/${total}`}>
            <Stack lg>
              <Stack>
                <div
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitTask()
                    }
                  }}
                >
                  <TextInput
                    label="New task"
                    value={taskTitle}
                    onChange={setTaskTitle}
                    placeholder="Buy milk"
                    error={null}
                  />
                </div>
                <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1 }}>
                    <select
                      className="lc-input"
                      aria-label="Repeat"
                      value={taskRecurrence}
                      onChange={(e) => setTaskRecurrence(e.target.value as Recurrence)}
                      style={{ width: '100%' }}
                    >
                      {RECURRENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <Button kind="primary" onClick={submitTask} ariaLabel="Add task">Add</Button>
                </div>
              </Stack>

              {todayTasks.length === 0 ? (
                <div>
                  <SectionLabel accent>No tasks yet</SectionLabel>
                  <p style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink-60)' }}>
                    Add a task above to get started.
                  </p>
                </div>
              ) : (
                <ul data-testid="task-list" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {todayTasks.map((task) => (
                    <li
                      key={task.id}
                      data-testid={`task-row-${task.id}`}
                      className={`dp-task-row${task.done ? ' done' : ''}`}
                    >
                      <span className="dp-task-check">
                        <Checkbox
                          label=""
                          checked={task.done}
                          onChange={() => toggleTask(task.id)}
                        />
                      </span>
                      <span className="dp-task-title">{task.title}</span>
                      <span className="dp-task-due">{task.due}</span>
                      {task.recurrence !== 'none' ? <span className="dp-task-due">{task.recurrence}</span> : null}
                      <Button
                        kind="ghost"
                        ariaLabel={`Delete ${task.title}`}
                        onClick={() => removeTask(task.id)}
                      >
                        Delete
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
        )}

        {tab === 'Calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(16px * var(--sf))' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'calc(8px * var(--sf))' }}>
              <div role="tablist" aria-label="Calendar views" style={{ display: 'flex', gap: 'calc(12px * var(--sf))' }}>
                {(['Month', 'Week'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="tab"
                    aria-selected={calendarView === v}
                    className="dp-tab"
                    style={{
                      fontFamily: 'var(--sans)',
                      fontSize: 'calc(13px * var(--tf))',
                      fontWeight: 600,
                      color: calendarView === v ? 'var(--ink)' : 'var(--ink-60)',
                      padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
                      border: 'none',
                      background: 'none',
                      borderBottom: `calc(2px * var(--sf)) solid ${calendarView === v ? 'var(--accent)' : 'transparent'}`,
                      cursor: 'pointer',
                    }}
                    onClick={() => setCalendarView(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                <Button kind="ghost" onClick={openEventForm} ariaLabel="Add event">Add event</Button>
                <Button kind="ghost" onClick={exportIcs} ariaLabel="Export ICS">Export ICS</Button>
              </div>
            </div>

            {eventFormOpen && (
              <Card title="New event" mono="calendar">
                <Stack>
                  <TextInput label="Title" value={eventTitle} onChange={setEventTitle} placeholder="Team Sync" error={null} />
                  <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                    <div style={{ flex: 1 }}>
                      <TextInput label="Date" type="date" value={eventDate} onChange={setEventDate} error={null} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <TextInput label="Time" value={eventTime} onChange={setEventTime} placeholder="09:00" error={null} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <select
                        className="lc-input"
                        aria-label="Repeat"
                        value={eventRecurrence}
                        onChange={(e) => setEventRecurrence(e.target.value as Recurrence)}
                        style={{ width: '100%' }}
                      >
                        {RECURRENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                    <Button kind="primary" onClick={submitEvent} ariaLabel="Save">Save</Button>
                    <Button kind="ghost" onClick={() => setEventFormOpen(false)} ariaLabel="Cancel">Cancel</Button>
                  </div>
                </Stack>
              </Card>
            )}

            {editingEvent !== null && (
              <div
                role="dialog"
                aria-label="Event details"
                aria-modal="true"
                style={{ display: 'flex', justifyContent: 'center' }}
              >
                <Card title={`Edit ${editingEvent.title}`} mono={editingEvent.date}>
                <Stack>
                  <div>
                    <span style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>
                      {editingEvent.time}
                    </span>
                  </div>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 'calc(8px * var(--sf))' }}>
                      <span style={{ fontFamily: 'var(--sans)', fontSize: 'calc(13px * var(--tf))', color: 'var(--ink)' }}>Recurrence</span>
                      <select
                        className="lc-input"
                        aria-label="Recurrence"
                        value={editRecurrence}
                        onChange={(e) => setEditRecurrence(e.target.value as Recurrence)}
                        style={{ flex: 1 }}
                      >
                        {RECURRENCE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
                    <Button kind="primary" onClick={saveEditEvent} ariaLabel="Save">Save</Button>
                    <Button kind="ghost" onClick={() => setEditingEvent(null)} ariaLabel="Cancel">Cancel</Button>
                  </div>
                </Stack>
              </Card>
              </div>
            )}

            {calendarView === 'Month' && (
              <Card title="Month" mono="grid">
                <div
                  role="toolbar"
                  aria-label="Month navigation"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'calc(8px * var(--sf))' }}
                >
                  <Button kind="ghost" onClick={() => shiftMonth(-1)} ariaLabel="Previous month">Prev</Button>
                  <span className="dp-month-label">{monthLabel(viewMonth.year, viewMonth.month)}</span>
                  <Button kind="ghost" onClick={() => shiftMonth(1)} ariaLabel="Next month">Next</Button>
                </div>
                <div
                  role="grid"
                  aria-label="Month"
                  className="cal-grid"
                  data-testid="calendar-month"
                >
                  <div role="row">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                      <div key={d} role="columnheader" className="cal-dow">{d}</div>
                    ))}
                  </div>
                  {Array.from({ length: Math.ceil(monthCellsISO.length / 7) }, (_, row) => {
                    const rowISOs = monthCellsISO.slice(row * 7, row * 7 + 7)
                    return (
                      <div key={`row-${row}`} role="row">
                        {rowISOs.map((iso) => {
                          const eventsHere = byDate.get(iso) ?? []
                          const tasksHere = dueDates.get(iso) ?? []
                          const inMonth = (() => {
                            const d = fromISODate(iso)
                            return d !== null && d.getFullYear() === viewMonth.year && d.getMonth() === viewMonth.month
                          })()
                          const d = fromISODate(iso)
                          const dayLabel = d
                            ? d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                            : iso
                          return (
                            <div
                              key={iso}
                              role="gridcell"
                              aria-label={dayLabel}
                              data-testid={`cal-day-${iso}`}
                              className={`cal-cell${inMonth ? '' : ' out'}${iso === today ? ' today' : ''}${iso === selectedISO ? ' selected' : ''}`}
                              onClick={() => setSelectedISO(iso)}
                            >
                              <span className="cal-num">{d?.getDate()}</span>
                              {eventsHere.slice(0, 3).map((ev: CalendarEvent) => (
                                <button
                                  key={`${ev.id}-${ev.time}`}
                                  type="button"
                                  className="cal-event"
                                  data-testid={`cal-event-${ev.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const item = events.find((x) => x.id === ev.id)
                                    if (item) startEditEvent(item)
                                  }}
                                >
                                  <span className="cal-event-time">{ev.time}</span>
                                  <span className="cal-event-title">{ev.title}</span>
                                </button>
                              ))}
                              {tasksHere.slice(0, 2).map((t, i) => (
                                <span key={`${iso}-task-${i}`} className="cal-task">{t}</span>
                              ))}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}

            {calendarView === 'Week' && (
              <Card title="Week" mono={monthLabel(viewMonth.year, viewMonth.month)}>
                <div
                  role="grid"
                  aria-label="Week"
                  className="cal-week"
                  data-testid="calendar-week"
                >
                  <div role="row">
                    {week.map((iso) => {
                      const d = fromISODate(iso)
                      const headerLabel = d
                        ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
                        : iso
                      return (
                        <div key={`head-${iso}`} role="columnheader" aria-label={headerLabel}>
                          <div className="cal-week-head">{headerLabel}</div>
                        </div>
                      )
                    })}
                  </div>
                  <div role="row">
                    {week.map((iso) => {
                      const eventsHere = weekByDate.get(iso) ?? []
                      const tasksHere = taskDueDates(tasks, iso, iso).get(iso) ?? []
                      return (
                        <div key={`cell-${iso}`} role="gridcell" className="cal-week-col">
                          {eventsHere.map((ev: CalendarEvent) => (
                            <button
                              key={`${ev.id}-${ev.time}`}
                              type="button"
                              className="cal-event-btn"
                              data-time={ev.time}
                              onClick={() => {
                                const item = events.find((x) => x.id === ev.id)
                                if (item) startEditEvent(item)
                              }}
                            >
                              {ev.title}
                            </button>
                          ))}
                          {tasksHere.map((t, i) => (
                            <div key={`${iso}-task-${i}`} className="cal-task">{t}</div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {error != null && (
          <div role="alert" className="form-error">
            {error} <Button kind="ghost" onClick={reset}>Try again</Button>
          </div>
        )}
        {copied && (
          <div role="status" style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', color: 'var(--accent)' }}>
            Copied ICS to clipboard
          </div>
        )}
      </div>
    </AppShell>
  )
}
