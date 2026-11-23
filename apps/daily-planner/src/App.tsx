import { useMemo, useState, type FormEvent } from 'react'
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
  PrimaryButton,
  Select,
  Stack,
  TextInput,
} from '@lacuna/ui'
import { useClipboard } from '@lacuna/use-clipboard'
import {
  WEEKDAYS,
  calendarEventsFor,
  monthCells,
  monthLabel,
  taskDueDates,
  todayISO,
  weekDays,
} from './lib/dates'
import { eventsToIcs } from './lib/ics'
import { buildReport } from './lib/report'
import { useEvents } from './lib/useEvents'
import { useTasks } from './lib/useTasks'
import type { EventData, EventItem, Recurrence } from './lib/types'

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Once' },
  { value: 'Daily', label: 'Daily' },
  { value: 'Weekly', label: 'Weekly' },
  { value: 'Monthly', label: 'Monthly' },
]

interface Draft {
  id?: string
  title: string
  date: string
  time: string
  recurrence: Recurrence
}

function emptyDraft(today: string): Draft {
  return { title: '', date: today, time: '', recurrence: 'none' }
}

export function App() {
  const today = todayISO()
  const [tab, setTab] = useState('Tasks')
  const [view, setView] = useState('Month')

  const { tasks, add, check, remove, clearFinished } = useTasks()
  const { events, add: addEvent, update: updateEvent, remove: removeEvent } = useEvents()

  const [taskTitle, setTaskTitle] = useState('')
  const [taskDue, setTaskDue] = useState(today)
  const [taskRecurrence, setTaskRecurrence] = useState<Recurrence>('none')
  const [taskError, setTaskError] = useState<string | null>(null)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  const [monthNav, setMonthNav] = useState<Date | null>(null)
  const [weekAnchorNav, setWeekAnchorNav] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(today)

  const { copy, copied } = useClipboard({ timeoutMs: 1500 })

  const latestEvent = events.length > 0 ? events[events.length - 1] : null
  const latestMonth = useMemo(() => {
    if (!latestEvent) return null
    const evDate = new Date(`${latestEvent.date}T00:00:00`)
    return new Date(evDate.getFullYear(), evDate.getMonth(), 1)
  }, [latestEvent?.date])
  const month = monthNav ?? latestMonth ?? new Date()

  const latestWeekAnchor = useMemo(() => {
    if (!latestEvent) return null
    const evDate = new Date(`${latestEvent.date}T00:00:00`)
    const day = evDate.getDay()
    const monday = new Date(evDate)
    monday.setDate(evDate.getDate() - ((day + 6) % 7))
    return toISODateString(monday)
  }, [latestEvent?.date])
  const weekAnchor = weekAnchorNav ?? latestWeekAnchor ?? today

  function submitTask() {
    const clean = taskTitle.trim()
    if (!clean) {
      setTaskError('Give the task a name')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(taskDue)) {
      setTaskError('Pick a due date')
      return
    }
    add({ title: clean, due: taskDue, done: false, recurrence: taskRecurrence })
    setTaskTitle('')
    setTaskRecurrence('none')
    setTaskError(null)
  }

  function openCreate() {
    setDraft(emptyDraft(today))
    setDraftError(null)
  }

  function openEdit(event: EventItem) {
    setDraft({ id: event.id, title: event.title, date: event.date, time: event.time, recurrence: event.recurrence })
    setDraftError(null)
  }

  function saveDraft() {
    if (!draft) return
    const clean = draft.title.trim()
    if (!clean) {
      setDraftError('Give the event a title')
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) {
      setDraftError('Pick a date')
      return
    }
    const data: EventData = {
      title: clean,
      date: draft.date,
      time: /^\d{2}:\d{2}$/.test(draft.time) ? draft.time : '',
      recurrence: draft.recurrence,
    }
    if (draft.id) {
      updateEvent(draft.id, data)
    } else {
      addEvent(data)
    }
    setDraft(null)
    setDraftError(null)
  }

  function exportIcs() {
    void copy(eventsToIcs(events))
  }

  const openCount = tasks.filter((t) => !t.done).length
  const doneCount = tasks.filter((t) => t.done).length
  const report = useMemo(() => buildReport(tasks, today), [tasks, today])

  const monthISO = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const monthDays = useMemo(
    () => monthCells(month.getFullYear(), month.getMonth()),
    [month],
  )
  const monthEvents = useMemo(
    () => calendarEventsFor(events, monthDays[0], monthDays[monthDays.length - 1]),
    [events, monthDays],
  )
  const monthByDate = useMemo(() => {
    const byDate = new Map<string, typeof monthEvents>()
    for (const event of monthEvents) {
      if (!event.date.startsWith(monthISO)) continue
      const list = byDate.get(event.date) ?? []
      list.push(event)
      byDate.set(event.date, list)
    }
    return byDate
  }, [monthEvents, monthISO])

  const daysOfWeek = useMemo(() => weekDays(weekAnchor), [weekAnchor])
  const weekEvents = useMemo(
    () => calendarEventsFor(events, daysOfWeek[0], daysOfWeek[6]),
    [events, daysOfWeek],
  )
  const weekByDate = useMemo(() => {
    const byDate = new Map<string, typeof weekEvents>()
    for (const event of weekEvents) {
      const list = byDate.get(event.date) ?? []
      list.push(event)
      byDate.set(event.date, list)
    }
    return byDate
  }, [weekEvents])

  const dueByDate = useMemo(
    () => taskDueDates(tasks, daysOfWeek[0], daysOfWeek[6]),
    [tasks, daysOfWeek],
  )

  function shiftMonth(delta: number) {
    setMonthNav(new Date(month.getFullYear(), month.getMonth() + delta, 1))
  }

  function shiftWeek(delta: number) {
    setWeekAnchorNav(() => {
      const base = new Date(`${weekAnchor}T00:00:00`)
      base.setDate(base.getDate() + delta * 7)
      return toISODateString(base)
    })
  }

  function toISODateString(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  const dayTitle = new Date(`${selectedDay}T00:00:00`).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const dayEvents = calendarEventsFor(events, selectedDay, selectedDay)
  const dayTasks = tasks.filter((t) => t.due === selectedDay)

  function handleTaskFormSubmit(e: FormEvent) {
    e.preventDefault()
    submitTask()
  }

  return (
    <AppShell name="Daily Planner" hue="teal" category="Planning" meta={`${report.streak}-day streak`}>
      <Card mono="Checklist" title="New task">
        <form onSubmit={handleTaskFormSubmit}>
          <FormGrid>
            <TextInput
              label="New task"
              value={taskTitle}
              onChange={setTaskTitle}
              placeholder="What needs doing?"
              error={taskError}
            />
            <TextInput label="Task due" type="date" value={taskDue} onChange={setTaskDue} />
            <Select
              label="Repeats"
              value={taskRecurrence}
              onChange={(value) => setTaskRecurrence(value as Recurrence)}
              options={RECURRENCE_OPTIONS}
            />
          </FormGrid>
          <Actions>
            <PrimaryButton type="submit">Add task</PrimaryButton>
            <Button kind="ghost" onClick={clearFinished}>
              Clear done
            </Button>
          </Actions>
        </form>
      </Card>

      <div role="tablist" className="lc-tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Tasks'}
          className={`lc-tab${tab === 'Tasks' ? ' active' : ''}`}
          onClick={() => setTab('Tasks')}
        >
          Tasks
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'Calendar'}
          className={`lc-tab${tab === 'Calendar' ? ' active' : ''}`}
          onClick={() => {
            setTab('Calendar')
            setView('Month')
          }}
        >
          Calendar
        </button>
      </div>

      {tab === 'Tasks' ? (
        <Card
          mono="List"
          title="Tasks"
          actions={
            <Button kind="ghost" onClick={exportIcs} ariaLabel="Export ICS">
              Export ICS
            </Button>
          }
        >
          <Stack>
            <KpiRow>
              <Kpi value={`${doneCount}/${tasks.length}`} label="Progress" accent />
              <Kpi value={String(openCount)} label="Open" />
              <Kpi value={String(report.streak)} label="Streak" />
            </KpiRow>
            {tasks.length === 0 ? (
              <EmptyState mono="Empty" title="No tasks yet" detail="Add your first task above." actionLabel="Add a task" onAction={submitTask} />
            ) : (
              <ul className="lk-list" aria-label="Tasks">
                {tasks.map((task) => (
                  <li key={task.id} className={task.done ? 'task-row done' : 'task-row'}>
                    <input
                      type="checkbox"
                      className="task-check"
                      checked={task.done}
                      aria-label={`Mark ${task.title} done`}
                      onChange={() => check(task.id)}
                    />
                    <span className={task.done ? 'task-title done' : 'task-title'}>{task.title}</span>
                    <span className="task-due">{task.due}</span>
                    <Button kind="ghost" ariaLabel={`Delete ${task.title}`} onClick={() => remove(task.id)}>
                      Delete
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Stack>
        </Card>
      ) : null}

      {tab === 'Calendar' ? (
        <Stack>
          <Card mono="Calendar" title="Events" actions={<Button kind="ghost" onClick={exportIcs} ariaLabel="Export ICS">Export ICS</Button>}>
            <Stack>
              <div role="tablist" className="lc-tabs">
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'Month'}
                  className={`lc-tab${view === 'Month' ? ' active' : ''}`}
                  onClick={() => setView('Month')}
                >
                  Month
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={view === 'Week'}
                  className={`lc-tab${view === 'Week' ? ' active' : ''}`}
                  onClick={() => setView('Week')}
                >
                  Week
                </button>
              </div>

                {view === 'Month' ? (
                  <Stack>
                    <div className="cal-head">
                      <Button kind="ghost" ariaLabel="Previous month" onClick={() => shiftMonth(-1)}>
                        Prev
                      </Button>
                      <span className="cal-month-label">{monthLabel(month.getFullYear(), month.getMonth())}</span>
                      <Button kind="ghost" ariaLabel="Next month" onClick={() => shiftMonth(1)}>
                        Next
                      </Button>
                    </div>
                    <div className="cal-grid" role="grid">
                      <div role="row">
                        {WEEKDAYS.map((day) => (
                          <div key={day} className="cal-dow" role="columnheader">
                            {day.slice(0, 3)}
                          </div>
                        ))}
                      </div>
                      {Array.from({ length: Math.ceil(monthDays.length / 7) }, (_, weekIdx) => {
                        const weekDaysSlice = monthDays.slice(weekIdx * 7, weekIdx * 7 + 7)
                        return (
                          <div key={weekIdx} role="row">
                            {weekDaysSlice.map((date) => {
                              const dayEventsList = monthByDate.get(date) ?? []
                              const inMonth = date.startsWith(monthISO)
                              return (
                                <div
                                  key={date}
                                  role="gridcell"
                                  className={`cal-cell${inMonth ? '' : ' out'}${date === today ? ' today' : ''}${
                                    date === selectedDay ? ' selected' : ''
                                  }`}
                                  onClick={() => setSelectedDay(date)}
                                >
                                  <span className="cal-num">{Number(date.slice(8))}</span>
                                  {dayEventsList.map((event) => {
                                    const original = events.find((e) => e.id === event.id)!
                                    return (
                                        <button
                                          key={event.id}
                                          type="button"
                                          className="cal-event"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openEdit(original)
                                          }}
                                         >
                                           {event.time ? `${event.title} ${event.time}` : event.title}
                                         </button>
                                    )
                                  })}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </Stack>
                ) : (
                <Stack>
                  <div className="cal-head">
                    <Button kind="ghost" ariaLabel="Previous week" onClick={() => shiftWeek(-1)}>
                      Prev
                    </Button>
                    <MonoLabel accent>
                      Week of {daysOfWeek[0]}
                    </MonoLabel>
                    <Button kind="ghost" ariaLabel="Next week" onClick={() => shiftWeek(1)}>
                      Next
                    </Button>
                  </div>
                    <table className="cal-week-table" aria-label="Week view">
                      <thead>
                        <tr>
                          {daysOfWeek.map((date, index) => {
                            const dayEventsList = weekByDate.get(date) ?? []
                            const dueTitles = dueByDate.get(date) ?? []
                            return (
                              <th key={date} scope="col">
                                <div className="cal-week-dayname">
                                  {WEEKDAYS[index]}
                                </div>
                                <div className="cal-week-date">
                                  {Number(date.slice(8))} {monthLabel(new Date(`${date}T00:00:00`).getFullYear(), new Date(`${date}T00:00:00`).getMonth()).slice(0, 3)}
                                </div>
                                {dayEventsList.map((event) => {
                                  const original = events.find((e) => e.id === event.id)!
                                  return (
                                    <button
                                      key={event.id}
                                      type="button"
                                      className="cal-event-btn"
                                      onClick={() => openEdit(original)}
                                     >
                                       {event.time ? `${event.title} ${event.time}` : event.title}
                                     </button>
                                  )
                                })}
                                {dueTitles.map((title) => (
                                  <div key={title} className="cal-task">
                                    {title}
                                  </div>
                                ))}
                              </th>
                            )
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {daysOfWeek.map((date) => (
                            <td key={date} />
                          ))}
                        </tr>
                      </tbody>
                    </table>
                </Stack>
              )}
            </Stack>
          </Card>

          {draft ? (
            <Card mono="Event" title={draft.id ? 'Edit event' : 'New event'}>
              <Stack>
                <FormGrid>
                  <TextInput label="Title" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} />
                  <TextInput label="Date" type="date" value={draft.date} onChange={(value) => setDraft({ ...draft, date: value })} />
                  <TextInput label="Time" type="time" value={draft.time} onChange={(value) => setDraft({ ...draft, time: value })} />
                  <Select
                    label="Recurrence"
                    value={draft.recurrence}
                    onChange={(value) => setDraft({ ...draft, recurrence: value as Recurrence })}
                    options={RECURRENCE_OPTIONS}
                  />
                </FormGrid>
                {draftError ? <div className="form-error">{draftError}</div> : null}
                <Actions>
                  <Button kind="ghost" onClick={() => setDraft(null)}>
                    Cancel
                  </Button>
                  <PrimaryButton onClick={saveDraft}>Save</PrimaryButton>
                </Actions>
              </Stack>
            </Card>
          ) : (
            <Card mono="Event" title="New event">
              <Actions>
                <PrimaryButton onClick={openCreate}>Add event</PrimaryButton>
              </Actions>
            </Card>
          )}
        </Stack>
      ) : null}
    </AppShell>
  )
}
