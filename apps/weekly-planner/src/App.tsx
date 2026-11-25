// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  AppShell,
  Card,
  EmptyState,
  ErrorState,
  List,
  Rail,
  Row,
  SectionLabel,
  TextInput,
  Button,
  PrimaryButton,
  Kpi,
  KpiRow,
} from '@lacuna/ui'
import { useCollection, type CollectionItem } from '@lacuna/use-collection'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const DAY_NAMES: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

type Tab = 'Week' | 'Month'

type EventData = { title: string; day: number; time: string }
type TaskData = { label: string; done: boolean }

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** Monday-based index of the week for a given date: 0 = Monday … 6 = Sunday. */
function mondayIndex(date: Date): number {
  return (date.getDay() + 6) % 7
}

/** ISO YYYY-MM-DD of the Monday that starts the week containing `date`. */
function isoMondayOfWeek(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const monday = new Date(d)
  monday.setDate(d.getDate() - mondayIndex(d))
  return `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`
}

/** ISO YYYY-MM-DD, local, of a date offset by `days`. */
function isoOffset(date: Date, days: number): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** ISO YYYYMMDD, local, of a date offset by `days`. */
function compactOffset(date: Date, days: number): string {
  return isoOffset(date, days).replace(/-/g, '')
}

/** Parse a 'HH:MM' string into a Date at local midnight offset by the given date. */
function eventDate(base: Date, time: string): Date {
  const [hh, mm] = time.split(':').map((v) => parseInt(v, 10))
  const h = Number.isNaN(hh) ? 0 : hh
  const m = Number.isNaN(mm) ? 0 : mm
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)
}

export function App() {
  const [tab, setTab] = useState<Tab>('Week')

  const events = useCollection<EventData>({ storageKey: 'weekly-planner:events' })
  const tasks = useCollection<TaskData>({ storageKey: 'weekly-planner:tasks' })

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDay, setDraftDay] = useState('Mon')
  const [draftTime, setDraftTime] = useState('09:00')
  const [taskDraft, setTaskDraft] = useState('')
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const taskFieldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = taskFieldRef.current
    if (node == null) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Enter') addTask()
    }
    node.addEventListener('keydown', onKey)
    return () => node.removeEventListener('keydown', onKey)
  })

  const clipboard = useClipboard()
  const [copyNote, setCopyNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  const today = useMemo(() => new Date(), [])
  const weekMonday = isoMondayOfWeek(today)
  const monthName = today.toLocaleString('en-US', { month: 'long' })

  const eventItems = events.state.activeItems
  const taskItems = tasks.state.activeItems
  const doneCount = taskItems.filter((t) => t.data.done).length
  const taskTotal = taskItems.length
  const allDone = taskTotal > 0 && doneCount === taskTotal
  const progressLabel = taskTotal > 0 ? `${taskTotal} of ${taskTotal}${allDone ? ' done' : ''}` : undefined

  const dayEvents = (day: number) => eventItems.filter((e) => e.data.day === day)

  function saveEvent() {
    const title = draftTitle.trim()
    if (title === '') return
    const dayIdx = DAYS.indexOf(draftDay.trim() as (typeof DAYS)[number])
    events.actions.add({ title, day: dayIdx < 0 ? 0 : dayIdx, time: draftTime })
    setDraftTitle('')
    setDraftDay('Mon')
    setDraftTime('09:00')
    setEventFormOpen(false)
    setCopyNote(null)
  }

  function addTask() {
    const label = taskDraft.trim()
    if (label === '') return
    tasks.actions.add({ label, done: false })
    setTaskDraft('')
    setTaskFormOpen(false)
  }

  function deleteEvent(id: string, title: string) {
    events.actions.remove(id)
    setCopyNote(null)
  }

  function deleteTask(id: string, label: string) {
    tasks.actions.remove(id)
  }

  function toggleTask(id: string, done: boolean) {
    tasks.actions.update(id, { done })
  }

  function exportIcs() {
    if (eventItems.length === 0) return
    const ics: IcsEvent[] = eventItems.map((ev) => {
      const iso = isoOffset(today, ev.data.day)
      const [yy, mo, dd] = iso.split('-').map((v) => parseInt(v, 10))
      const [hh, mm] = ev.data.time.split(':').map((v) => parseInt(v, 10))
      const h = Number.isNaN(hh) ? 9 : hh
      const m = Number.isNaN(mm) ? 0 : mm
      const start = `${yy}-${pad2(mo)}-${pad2(dd)}T${pad2(h)}:${pad2(m)}:00`
      const endH = h + 1
      const endM = m
      const end = `${yy}-${pad2(mo)}-${pad2(dd)}T${pad2(endH)}:${pad2(endM)}:00`
      return {
        id: ev.id,
        summary: ev.data.title,
        description: 'From Weekly Planner',
        startDate: start,
        endDate: end,
        allDay: false,
      }
    })
    const icsText = toIcs(ics)
    clipboard
      .copy(icsText)
      .then(() => setCopyNote({ kind: 'ok', text: 'ICS copied to clipboard' }))
      .catch(() => setCopyNote({ kind: 'err', text: 'Copy failed — try again' }))
  }

  // Month grid: cells for the current month.
  const monthDays = today.getDate()
  const firstWeekday = (new Date(today.getFullYear(), today.getMonth(), 1).getDay() + 6) % 7 // Monday-based offset
  const cells: { day: number; events: CollectionItem<EventData>[] }[] = []
  for (let i = 0; i < monthDays; i++) {
    cells.push({ day: i + 1, events: [] })
  }
  // Calendar date of a week day index (0 = Monday of this week … 6 = Sunday).
  const weekMondayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayIndex(today))
  for (const ev of eventItems) {
    const dayDate = new Date(weekMondayDate.getFullYear(), weekMondayDate.getMonth(), weekMondayDate.getDate() + ev.data.day)
    if (dayDate.getFullYear() === today.getFullYear() && dayDate.getMonth() === today.getMonth()) {
      const idx = dayDate.getDate() - 1
      if (idx >= 0 && idx < monthDays) cells[idx].events.push(ev)
    }
  }

  return (
    <AppShell
      name="Weekly Planner"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={`${eventItems.length} event${eventItems.length === 1 ? '' : 's'}`}
      side={
        <Rail
          title="This week"
          note={weekMonday}
          chips={[`${eventItems.length} events`]}
        >
          <KpiRow>
            <Kpi value={eventItems.length} label="Events" />
            <Kpi value={`${doneCount}/${taskItems.length}`} label="Tasks" accent={taskItems.length > 0 && doneCount === taskItems.length} />
          </KpiRow>
          <SectionLabel>Export</SectionLabel>
          <Button
            kind="secondary"
            onClick={exportIcs}
            disabled={eventItems.length === 0}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Export ICS
          </Button>
          {copyNote ? (
            copyNote.kind === 'ok' ? (
              <div style={{ marginTop: 'calc(8px * var(--sf))' }} className="lc-mono lc-mono-sm lc-accent">
                {copyNote.text}
              </div>
            ) : (
              <ErrorState title={copyNote.text} mono="Clipboard" style={{ marginTop: 'calc(8px * var(--sf))' }} />
            )
          ) : null}
        </Rail>
      }
    >
      <div
        style={{
          display: 'flex',
          gap: 'calc(4px * var(--sf))',
          borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)',
          marginBottom: 'calc(16px * var(--sf))',
        }}
        role="tablist"
        aria-label="Views"
      >
        {(['Week', 'Month'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`wp-tab${tab === t ? ' active' : ''}`}
            style={{
              fontFamily: 'var(--sans)',
              fontSize: 'calc(12.5px * var(--tf))',
              fontWeight: 600,
              color: tab === t ? 'var(--ink)' : 'var(--ink-80)',
              padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
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

      {tab === 'Week' ? (
        <>
          <Card
            title="Events"
            mono="Stored on this device"
            actions={
              eventFormOpen || eventItems.length > 0 ? (
                <Button kind="secondary" onClick={() => setEventFormOpen((v) => !v)}>
                  {eventFormOpen ? 'Close' : 'Add event'}
                </Button>
              ) : null
            }
          >
            {eventFormOpen ? (
              <>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0,1fr) calc(120px * var(--sf)) calc(120px * var(--sf))',
                    gap: 'calc(10px * var(--sf))',
                    alignItems: 'end',
                  }}
                >
                  <TextInput label="Title" value={draftTitle} onChange={setDraftTitle} placeholder="e.g. Team Sync" />
                  <TextInput label="Day" value={draftDay} onChange={setDraftDay} placeholder="Mon–Sun" />
                  <TextInput label="Time" value={draftTime} onChange={setDraftTime} placeholder="10:00" />
                </div>
                <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                  <PrimaryButton onClick={saveEvent} disabled={draftTitle.trim() === ''}>
                    Save
                  </PrimaryButton>
                </div>
              </>
            ) : (
              eventItems.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No events yet"
                  detail="Plan your week by adding your first event."
                  actionLabel="Add event"
                  onAction={() => setEventFormOpen(true)}
                />
              ) : null
            )}
          </Card>

          <Card
            title="This week"
            mono={
              eventItems.length === 0 ? undefined : `${eventItems.length} event${eventItems.length === 1 ? '' : 's'}`
            }
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
                gap: 'calc(8px * var(--sf))',
              }}
            >
              {DAYS.map((day, di) => {
                const evs = dayEvents(di)
                return (
                  <div
                    key={day}
                    style={{
                      border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                      borderRadius: 'calc(6px * var(--sf))',
                      padding: 'calc(8px * var(--sf))',
                      minHeight: 'calc(72px * var(--sf))',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'var(--mono)',
                        fontSize: 'calc(10.5px * var(--tf))',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--mid)',
                        marginBottom: 'calc(6px * var(--sf))',
                      }}
                    >
                      {day}
                    </div>
                    {evs.length === 0 ? (
                      <div className="lc-faint" style={{ fontSize: 'calc(11px * var(--tf))', color: 'var(--ink-60)' }}>
                        —
                      </div>
                    ) : (
                      <List label={`${day} events`}>
                        {evs.map((ev) => (
                          <Row
                            key={ev.id}
                            title={ev.data.title}
                            meta={ev.data.time}
                            action={
                              <button
                                type="button"
                                className="lc-btn ghost"
                                style={{
                                  fontSize: 'calc(10.5px * var(--tf))',
                                  padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))',
                                }}
                                onClick={() => deleteEvent(ev.id, ev.data.title)}
                              >
                                {`Delete ${ev.data.title}`}
                              </button>
                            }
                          />
                        ))}
                      </List>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          <Card
            title="Tasks"
            mono={progressLabel}
            actions={
              taskFormOpen || taskItems.length > 0 ? (
                <Button kind="secondary" onClick={() => setTaskFormOpen((v) => !v)}>
                  {taskFormOpen ? 'Close' : 'Add task'}
                </Button>
              ) : null
            }
          >
            {taskFormOpen ? (
              <div ref={taskFieldRef} style={{ display: 'flex', flexDirection: 'column', gap: 'calc(10px * var(--sf))' }}>
                <TextInput
                  label="New task"
                  value={taskDraft}
                  onChange={(v) => setTaskDraft(v)}
                  placeholder="e.g. Review PR"
                />
              </div>
            ) : null}
            {taskItems.length === 0 && !taskFormOpen ? (
              <EmptyState
                mono="Empty"
                title="No tasks yet"
                detail="Track your week by adding a task."
                actionLabel="Add task"
                onAction={() => setTaskFormOpen(true)}
              />
            ) : (
              <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                <List label="Tasks">
                  {taskItems.map((t) => (
                    <Row
                      key={t.id}
                      title={
                        <label className={`wp-task${t.data.done ? ' done' : ''}`}>
                          <input
                            type="checkbox"
                            checked={t.data.done}
                            onChange={(e) => toggleTask(t.id, e.target.checked)}
                          />
                          <span className="wp-task-label">{t.data.label}</span>
                        </label>
                      }
                      action={
                        <button
                          type="button"
                          className="lc-btn ghost"
                          style={{
                            fontSize: 'calc(10.5px * var(--tf))',
                            padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))',
                          }}
                          onClick={() => deleteTask(t.id, t.data.label)}
                        >
                          {`Delete ${t.data.label}`}
                        </button>
                      }
                    />
                  ))}
                </List>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card title={monthName} mono={isoOffset(today, 0)}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, minmax(0,1fr))',
              gap: 'calc(4px * var(--sf))',
            }}
          >
            {DAYS.map((d) => (
              <div
                key={d}
                style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 'calc(10.5px * var(--tf))',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  color: 'var(--mid)',
                  textAlign: 'center',
                  padding: 'calc(4px * var(--sf)) 0',
                }}
              >
                {d}
              </div>
            ))}
            {/* Leading blank cells so day 1 starts on the right weekday */}
            {Array.from({ length: firstWeekday }).map((_, i) => (
              <div
                key={`pad-${i}`}
                role="cell"
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                  borderRadius: 'calc(4px * var(--sf))',
                  minHeight: 'calc(40px * var(--sf))',
                }}
              />
            ))}
            {cells.map((c) => (
              <div
                key={c.day}
                role="cell"
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--ui-line)',
                  borderRadius: 'calc(4px * var(--sf))',
                  padding: 'calc(4px * var(--sf))',
                  minHeight: 'calc(40px * var(--sf))',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(10px * var(--tf))',
                    color: 'var(--ink-60)',
                    marginBottom: 'calc(2px * var(--sf))',
                  }}
                >
                  {c.day}
                </div>
                {c.events.map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      fontSize: 'calc(10.5px * var(--tf))',
                      color: 'var(--ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={ev.data.title}
                  >
                    {ev.data.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      )}
    </AppShell>
  )
}
