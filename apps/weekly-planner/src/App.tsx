// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorState,
  Kpi,
  KpiRow,
  Keys,
  List,
  PrimaryButton,
  Rail,
  Row,
  SectionLabel,
  Select,
  TextInput,
  Tag,
} from '@lacuna/ui'
import { useCollection, type CollectionItem } from '@lacuna/use-collection'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { useUndoStack } from '@lacuna/use-undo-stack'
import { Chart, type ChartDataPoint } from '@lacuna/chart'
import { exportBackup, importBackup, type BackupRecord } from '@lacuna/json-backup'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

type Tab = 'Week' | 'Month' | 'Data'

type EventData = { title: string; day: number; time: string }
type TaskData = { label: string; done: boolean }

interface Snapshot {
  events: EventData[]
  tasks: TaskData[]
}

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

function formatTime(time: string, ampm: boolean): string {
  const [hh, mm] = time.split(':')
  const h = parseInt(hh, 10)
  const m = mm ?? '00'
  if (!Number.isNaN(h)) {
    if (ampm) {
      const period = h >= 12 ? 'PM' : 'AM'
      const h12 = h % 12 === 0 ? 12 : h % 12
      return `${h12}:${m} ${period}`
    }
    return `${pad2(h)}:${m}`
  }
  return time
}

export function App() {
  const [tab, setTab] = useState<Tab>('Week')
  const [ampm, setAmpm] = useState(false)

  const events = useCollection<EventData>({ storageKey: 'weekly-planner:events' })
  const tasks = useCollection<TaskData>({ storageKey: 'weekly-planner:tasks' })

  const [draftTitle, setDraftTitle] = useState('')
  const [draftDay, setDraftDay] = useState('Mon')
  const [draftTime, setDraftTime] = useState('09:00')
  const [taskDraft, setTaskDraft] = useState('')
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const taskFieldRef = useRef<HTMLDivElement>(null)

  const snapshot = useUndoStack<Snapshot>({
    events: [],
    tasks: [],
  }, { limit: 50 })

  const [restoreNote, setRestoreNote] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [importText, setImportText] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

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

  const chartData = useMemo<ChartDataPoint[]>(() => DAYS.map((d, i) => ({ label: d, value: dayEvents(i).length })), [eventItems])

  function saveEvent() {
    const title = draftTitle.trim()
    if (title === '') return
    const dayIdx = DAYS.indexOf(draftDay.trim() as (typeof DAYS)[number])
    snapshot.set({
      events: eventItems.map((e) => e.data),
      tasks: taskItems.map((t) => t.data),
    })
    events.actions.add({ title, day: dayIdx < 0 ? 0 : dayIdx, time: draftTime })
    setDraftTitle('')
    setDraftDay('Mon')
    setDraftTime('09:00')
    setEventFormOpen(false)
    setCopyNote(null)
    setRestoreNote(null)
  }

  function addTask() {
    const label = taskDraft.trim()
    if (label === '') return
    snapshot.set({
      events: eventItems.map((e) => e.data),
      tasks: taskItems.map((t) => t.data),
    })
    tasks.actions.add({ label, done: false })
    setTaskDraft('')
    setTaskFormOpen(false)
  }

  function deleteEvent(id: string) {
    snapshot.set({
      events: eventItems.map((e) => e.data),
      tasks: taskItems.map((t) => t.data),
    })
    events.actions.remove(id)
    setCopyNote(null)
    setRestoreNote(null)
  }

  function deleteTask(id: string) {
    snapshot.set({
      events: eventItems.map((e) => e.data),
      tasks: taskItems.map((t) => t.data),
    })
    tasks.actions.remove(id)
  }

  function toggleTask(id: string, done: boolean) {
    snapshot.set({
      events: eventItems.map((e) => e.data),
      tasks: taskItems.map((t) => t.data),
    })
    tasks.actions.update(id, { done })
  }

  function applySnapshot(next: Snapshot) {
    for (const e of eventItems) events.actions.remove(e.id)
    for (const t of taskItems) tasks.actions.remove(t.id)
    for (const e of next.events) events.actions.add(e)
    for (const t of next.tasks) tasks.actions.add(t)
  }

  function undo() {
    if (!snapshot.canUndo) return
    const prev = snapshot.value
    snapshot.undo()
    applySnapshot(prev)
    setCopyNote(null)
    setRestoreNote(null)
  }

  function redo() {
    if (!snapshot.canRedo) return
    const next = snapshot.value
    snapshot.redo()
    applySnapshot(next)
    setCopyNote(null)
    setRestoreNote(null)
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

  function backupRecords(kind: 'events' | 'tasks'): BackupRecord<EventData>[] {
    if (kind === 'events') {
      return eventItems.map((e) => ({ id: e.id, data: e.data, createdAt: e.createdAt, updatedAt: e.updatedAt }))
    }
    return []
  }

  function downloadBackup() {
    const kind = 'events'
    const json = exportBackup<EventData>({
      appId: 'weekly-planner',
      version: 1,
      records: backupRecords(kind),
      filename: `weekly-planner-${kind}-${isoOffset(today, 0)}`,
    })
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weekly-planner-${kind}-${isoOffset(today, 0)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setRestoreNote({ kind: 'ok', text: 'Backup downloaded' })
  }

  function restoreFromText(text: string) {
    try {
      const result = importBackup<EventData>(text, { currentVersion: 1 })
      for (const e of eventItems) events.actions.remove(e.id)
      for (const r of result.records) events.actions.add(r.data)
      setRestoreNote({
        kind: 'ok',
        text: `Restored ${result.records.length} event${result.records.length === 1 ? '' : 's'}`,
      })
      setImportText('')
    } catch {
      setRestoreNote({ kind: 'err', text: 'That file is not a Weekly Planner backup' })
    }
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (file == null) return
    const reader = new FileReader()
    reader.onload = () => restoreFromText(String(reader.result ?? ''))
    reader.readAsText(file)
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
          <Divider />
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
          <Divider />
          <SectionLabel>Undo</SectionLabel>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <Button kind="ghost" onClick={undo} disabled={!snapshot.canUndo} style={{ flex: '1' }}>
              Undo
            </Button>
            <Button kind="ghost" onClick={redo} disabled={!snapshot.canRedo} style={{ flex: '1' }}>
              Redo
            </Button>
          </div>
          <Divider />
          <Keys items={[['Tab', 'Switch views'], ['Enter', 'Add a task']]} />
        </Rail>
      }
    >
      <div className="lc-tabs" role="tablist" aria-label="Views">
        {(['Week', 'Month', 'Data'] as const).map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={tab === item}
            className={tab === item ? 'lc-tab active' : 'lc-tab'}
            style={tab === item ? undefined : { color: 'var(--ink-60)' }}
            onClick={() => setTab(item)}
          >
            {item}
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
                            meta={formatTime(ev.data.time, ampm)}
                            action={
                              <button
                                type="button"
                                className="lc-btn ghost"
                                style={{
                                  fontSize: 'calc(10.5px * var(--tf))',
                                  padding: 'calc(2px * var(--sf)) calc(6px * var(--sf))',
                                }}
                                onClick={() => deleteEvent(ev.id)}
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
                          onClick={() => deleteTask(t.id)}
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
      ) : tab === 'Month' ? (
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
      ) : (
        <>
          <Card title="Events per day" mono="Bar chart">
            <div className="wp-chart" style={{ marginTop: 'calc(8px * var(--sf))' }}>
              <Chart type="bar" data={chartData} title="Events per day" ariaLabel="Event counts across the week" width={280} height={150} />
            </div>
          </Card>

          <Card
            title="Backup"
            mono={`${eventItems.length + taskItems.length} record${eventItems.length + taskItems.length === 1 ? '' : 's'}`}
          >
            <p className="lc-body-sm" style={{ margin: 0 }}>
              Your events and tasks stay on this device. Download a JSON backup to keep them, or restore a
              backup you saved earlier.
            </p>
            <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))', marginTop: 'calc(10px * var(--sf))' }}>
              <Button kind="secondary" onClick={downloadBackup}>
                Download backup
              </Button>
              <Button kind="ghost" onClick={() => fileRef.current?.click()}>
                Restore from file
              </Button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={onFileChange}
            />
            <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
              <TextInput
                label="Or paste backup JSON"
                value={importText}
                onChange={setImportText}
                rows={3}
                placeholder='{"appId":"weekly-planner","version":1,...}'
              />
            </div>
            {importText.trim() !== '' ? (
              <div style={{ marginTop: 'calc(8px * var(--sf))' }}>
                <Button kind="secondary" onClick={() => restoreFromText(importText)}>
                  Restore pasted backup
                </Button>
              </div>
            ) : null}
            {restoreNote ? (
              restoreNote.kind === 'ok' ? (
                <div style={{ marginTop: 'calc(8px * var(--sf))' }} className="lc-mono lc-mono-sm lc-accent">
                  {restoreNote.text}
                </div>
              ) : (
                <ErrorState title={restoreNote.text} mono="Restore" style={{ marginTop: 'calc(8px * var(--sf))' }} />
              )
            ) : null}
          </Card>

          <Card title="Settings" mono="Preferences">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(16px * var(--sf))', flexWrap: 'wrap' }}>
              <Select
                label="Time format"
                value={ampm ? 'ampm' : '24h'}
                onChange={(v) => setAmpm(v === 'ampm')}
                options={[
                  { value: '24h', label: '24-hour (14:00)' },
                  { value: 'ampm', label: '12-hour (2:00 PM)' },
                ]}
              />
              <Tag accent={false}>{ampm ? '12-hour clock' : '24-hour clock'}</Tag>
            </div>
            <p className="lc-body-sm" style={{ margin: 'calc(10px * var(--sf)) 0 0' }}>
              The time format applies to the event list in the Week view.
            </p>
          </Card>
        </>
      )}
    </AppShell>
  )
}
