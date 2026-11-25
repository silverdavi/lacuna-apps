// Personal Calendar: add, view, and delete events on a month grid,
// with ICS import/export.
import { useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { addDays, addMonths, startOfMonth, endOfMonth, toISODate } from '@lacuna/date-math'
import { saveText } from '@lacuna/file-save-open'
import { toIcs, fromIcs } from '@lacuna/ics-calendar'
import {
  AppShell,
  Card,
  Button,
  TextInput,
  FormGrid,
  Actions,
} from '@lacuna/ui'
import { listEvents, addEvent, removeEvent, uid } from './host'
import type { CalendarEvent } from './host'

const MONTH_NAMES = [
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

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const VIEW_KEY = 'lacuna.calendar-app:view-date'

function nowUtc(): Date {
  const t = new Date()
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}

function loadViewDate(): Date {
  try {
    const raw = localStorage.getItem(VIEW_KEY)
    if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number)
      return new Date(Date.UTC(y, m - 1, d))
    }
  } catch {
    // fall through to today
  }
  return nowUtc()
}

function saveViewDate(d: Date): void {
  try {
    localStorage.setItem(VIEW_KEY, isoDate(d))
  } catch {
    // ignore
  }
}

function usDate(d: Date): string {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`
}

function isoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthShort(d: Date): string {
  return `${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

function timeShort(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const period = h < 12 ? 'AM' : 'PM'
  const hh = h % 12 === 0 ? 12 : h % 12
  return `${hh}:${String(m).padStart(2, '0')} ${period}`
}

function normalizeDate(v: string): string {
  if (!/^\d{4}-\d{2}-\d{2}/.test(v)) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(v)
    if (m) return `${m[1]}-${m[2]}-${m[3]}`
  }
  return v.slice(0, 10)
}

function eventFromIcs(e: { id: string; summary: string; startDate: string }): CalendarEvent {
  const allDay = !e.startDate.includes('T')
  const date = normalizeDate(e.startDate)
  const time = allDay ? '' : `${e.startDate.slice(11, 13)}:${e.startDate.slice(14, 16)}`
  return { id: e.id, title: e.summary, date, time }
}

function EventDialog({
  label,
  onClose,
  children,
}: {
  label: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="cal-overlay">
      <div role="dialog" aria-label={label} className="cal-dialog">
        {children}
      </div>
      <button
        type="button"
        className="cal-dialog-close"
        aria-label={`Close ${label}`}
        onClick={onClose}
      >
        ×
      </button>
    </div>
  )
}

export function App() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => listEvents())
  const [currentDate, setCurrentDate] = useState<Date>(loadViewDate)
  const [detail, setDetail] = useState<CalendarEvent | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState({ title: '', date: '', time: '' })
  const [formError, setFormError] = useState<string | null>(null)

  const month = useMemo(() => startOfMonth(currentDate), [currentDate])
  const daysInMonth = useMemo(() => endOfMonth(month).getUTCDate(), [month])
  const cells = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => addDays(month, i)),
    [month, daysInMonth],
  )
  const todayIso = isoDate(nowUtc())

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const list = map.get(ev.date) ?? []
      list.push(ev)
      map.set(ev.date, list)
    }
    return map
  }, [events])

  const monthEvents = useMemo(
    () =>
      events
        .filter((ev) => {
          const d = new Date(ev.date + 'T00:00:00Z')
          return (
            d.getUTCMonth() === currentDate.getUTCMonth() &&
            d.getUTCFullYear() === currentDate.getUTCFullYear()
          )
        })
        .sort((a, b) =>
          a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
        ),
    [events, currentDate],
  )

  const onNav = (offset: 1 | -1) =>
    setCurrentDate((prev) => addMonths(startOfMonth(prev), offset))

  const openAdd = () => {
    const inCurrentMonth = cells.some((d) => isoDate(d) === todayIso)
    setDraft({
      title: '',
      date: inCurrentMonth ? todayIso : toISODate(month),
      time: '',
    })
    setFormError(null)
    setShowForm(true)
  }

  const onSubmit = () => {
    if (!draft.title.trim()) {
      setFormError('Title is required')
      return
    }
    if (!draft.date) {
      setFormError('Date is required')
      return
    }
    addEvent({
      id: uid(),
      title: draft.title.trim(),
      date: draft.date,
      time: draft.time || '',
    })
    setEvents(listEvents())
    setShowForm(false)
    const target = new Date(draft.date + 'T00:00:00Z')
    setCurrentDate(target)
    saveViewDate(target)
  }

  const onDelete = (id: string) => {
    removeEvent(id)
    setEvents(listEvents())
    setDetail(null)
  }

  const onExport = () => {
    const ics = toIcs(
      events.map((ev) => ({
        id: ev.id,
        summary: ev.title,
        startDate: ev.time ? `${ev.date}T${ev.time.padEnd(8, ':0').slice(0, 8)}` : ev.date,
        allDay: !ev.time,
      })),
    )
    saveText(ics, { filename: 'calendar.ics', mimeType: 'text/calendar' })
  }

  const fileInput = useRef<HTMLInputElement | null>(null)

  const onImportClick = () => {
    fileInput.current?.click()
  }

  const onImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const text = await file.text()
    const imported = fromIcs(text).map(eventFromIcs)
    const existing = new Set(events.map((e) => e.id))
    const fresh = imported.filter((ev) => !existing.has(ev.id))
    for (const ev of fresh) addEvent(ev)
    if (fresh.length > 0) setEvents(listEvents())
    if (imported.length > 0 && imported[0].date) {
      const target = new Date(imported[0].date + 'T00:00:00Z')
      setCurrentDate(target)
      saveViewDate(target)
    }
  }

  return (
    <>
      <AppShell
        name="Personal Calendar"
        icon="calendar"
        hue="teal"
        category="productivity"
        meta={`${events.length} event${events.length === 1 ? '' : 's'} · ${monthShort(currentDate)}`}
        status={
          detail
            ? `Viewing ${detail.title}`
            : showForm
              ? 'Adding an event'
              : `Showing ${MONTH_NAMES[currentDate.getUTCMonth()]} ${currentDate.getUTCFullYear()}`
        }
        side={
          <div className="cal-card-stack">
            <Card title="This month" mono={`${monthEvents.length} events`} flush accent>
              {monthEvents.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--ink-60)' }}>No events this month</p>
              ) : (
                <div className="cal-list">
                  {monthEvents.map((ev) => (
                    <div key={ev.id} className="cal-list-row">
                      <span className="cal-list-date">{ev.date}</span>
                      <button className="cal-list-title" onClick={() => setDetail(ev)}>
                        {ev.title}
                      </button>
                      {ev.time && (
                        <span className="cal-list-time">{timeShort(ev.time)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        }
      >
        <Card
          title={
            <h2 aria-label="Month title">
              {MONTH_NAMES[currentDate.getUTCMonth()]} {currentDate.getUTCFullYear()}
            </h2>
          }
          mono={`${events.length} event${events.length === 1 ? '' : 's'}`}
          actions={
            <div className="cal-toolbar">
              <div className="cal-nav">
                <Button ariaLabel="Previous month" onClick={() => onNav(-1)}>
                  ←
                </Button>
                <Button ariaLabel="Next month" onClick={() => onNav(1)}>
                  →
                </Button>
              </div>
              <div className="cal-actions">
                <Button ariaLabel="Import ICS" onClick={onImportClick}>
                  Import ICS
                </Button>
                <Button ariaLabel="Export ICS" onClick={onExport}>
                  Export ICS
                </Button>
                <Button kind="primary" ariaLabel="Add event" onClick={openAdd}>
                  + Add
                </Button>
              </div>
            </div>
          }
        >
          <input
            ref={fileInput}
            type="file"
            accept=".ics,text/calendar"
            style={{ display: 'none' }}
            onChange={(e) => void onImport(e)}
          />
          <div role="grid" aria-label="Month">
            <div className="cal-grid">
              <div role="row" aria-label="Weekdays">
                {DAY_NAMES.map((d) => (
                  <div key={d} className="cal-grid-head" role="columnheader">
                    {d}
                  </div>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, r) => (
                <div key={r} role="row" aria-label={`Week ${r + 1}`}>
                  {Array.from({ length: 7 }, (_, c) => {
                    const d = addDays(month, r * 7 + c)
                    const iso = isoDate(d)
                    const inMonth = d.getUTCMonth() === month.getUTCMonth()
                    const cellEvents = inMonth ? (byDate.get(iso) ?? []) : []
                    return (
                      <div
                        key={iso}
                        role="gridcell"
                        aria-label={usDate(d)}
                        className={`cal-cell${iso === todayIso ? ' today' : ''}${
                          inMonth ? '' : ' off'
                        }`}
                      >
                        <span className="cal-cell-date">{d.getUTCDate()}</span>
                        {cellEvents.map((ev) => (
                          <button key={ev.id} className="cal-block" onClick={() => setDetail(ev)}>
                            {ev.title}
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </AppShell>

      {showForm && (
        <EventDialog label="Event form" onClose={() => setShowForm(false)}>
          <FormGrid>
            <TextInput
              label="Title"
              value={draft.title}
              onChange={(v) => setDraft((d) => ({ ...d, title: v }))}
              error={formError === 'Title is required' ? 'Title is required' : null}
              placeholder="e.g. Team Sync"
            />
            <TextInput
              label="Date"
              type="date"
              value={draft.date}
              onChange={(v) => setDraft((d) => ({ ...d, date: v }))}
              error={formError === 'Date is required' ? 'Date is required' : null}
            />
            <TextInput
              label="Time"
              type="time"
              value={draft.time}
              onChange={(v) => setDraft((d) => ({ ...d, time: v }))}
            />
            <div>
              <Actions>
                <Button ariaLabel="Save" kind="primary" onClick={onSubmit}>
                  Save
                </Button>
                <Button ariaLabel="Cancel" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </Actions>
            </div>
          </FormGrid>
        </EventDialog>
      )}

      {detail && (
        <EventDialog label="Event details" onClose={() => setDetail(null)}>
          <div className="cal-detail">
            <div className="cal-detail-title">{detail.title}</div>
            <div className="cal-detail-rows">
              <div className="cal-detail-row">
                <span className="cal-detail-label">Title: </span>
                <span className="cal-detail-value">{detail.title}</span>
              </div>
              <div className="cal-detail-row">
                <span className="cal-detail-label">Date: </span>
                <span className="cal-detail-value">{detail.date}</span>
              </div>
              <div className="cal-detail-row">
                <span className="cal-detail-label">Time: </span>
                <span className="cal-detail-value">{detail.time || 'All day'}</span>
              </div>
            </div>
            <Actions>
              <Button ariaLabel="Delete" kind="danger" onClick={() => onDelete(detail.id)}>
                Delete
              </Button>
              <Button ariaLabel="Close" onClick={() => setDetail(null)}>
                Close
              </Button>
            </Actions>
          </div>
        </EventDialog>
      )}
    </>
  )
}
