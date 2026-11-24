// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  TextInput,
} from '@lacuna/ui'
import { addMonths, fromISODate, startOfWeek, toISODate } from '@lacuna/date-math'
import { fromIcs, toIcs, validateIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { openFile, saveText } from '@lacuna/file-save-open'
import { addEvent, listEvents, removeEvent, type CalendarEvent } from './host'
import './app.css'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function monthHeading(anchor: string): string {
  const d = fromISODate(anchor)
  if (!d) return ''
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function monthCells(anchor: string): { iso: string; inMonth: boolean }[] {
  const d = fromISODate(anchor)
  if (!d) return []
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const start = startOfWeek(first, 1)
  const cells: { iso: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const cell = new Date(start.getTime() + i * 86400000)
    cells.push({
      iso: toISODate(cell),
      inMonth: cell.getMonth() === d.getMonth(),
    })
  }
  return cells
}

function timeOf(startDate: string): string {
  const t = startDate.slice(11, 16)
  return /^\d{2}:\d{2}$/.test(t) ? t : ''
}

function eventDateTime(ev: CalendarEvent): string {
  return ev.time === '' ? ev.date : `${ev.date}T${ev.time}`
}

interface FormState {
  title: string
  date: string
  time: string
  error: string | null
}

function detailRows(ev: CalendarEvent): Array<[string, string]> {
  const rows: Array<[string, string]> = [['Date', ev.date]]
  if (ev.time !== '') rows.push(['Time', ev.time])
  return rows
}

const TODAY = toISODate(new Date())

export function App() {
  const [events, setEvents] = useState<CalendarEvent[]>(() => listEvents())
  const [anchor, setAnchor] = useState(TODAY)
  const [form, setForm] = useState<FormState | null>(null)
  const [selected, setSelected] = useState<CalendarEvent | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (notice === null) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setForm(null)
        setSelected(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const ev of events) {
      const list = map.get(ev.date) ?? []
      list.push(ev)
      map.set(ev.date, list)
    }
    return map
  }, [events])

  const cells = useMemo(() => monthCells(anchor), [anchor])
  const total = events.length
  const currentEvents = useMemo(
    () =>
      cells
        .filter((c) => c.inMonth)
        .flatMap((c) => byDay.get(c.iso) ?? [])
        .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time)),
    [cells, byDay],
  )

  function shift(offset: number) {
    const d = fromISODate(anchor)
    if (!d) return
    setAnchor(toISODate(addMonths(d, offset)))
  }

  function refresh() {
    setEvents(listEvents())
  }

  function openForm() {
    setForm({ title: '', date: anchor, time: '', error: null })
  }

  function saveForm() {
    if (!form) return
    const title = form.title.trim()
    if (title === '') {
      setForm({ ...form, error: 'Title is required' })
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) {
      setForm({ ...form, error: 'Pick a valid date' })
      return
    }
    addEvent({ title, date: form.date, time: form.time })
    setEvents(listEvents())
    setForm(null)
    setSelected(null)
  }

  function deleteSelected() {
    if (!selected) return
    removeEvent(selected.id)
    setEvents(listEvents())
    setSelected(null)
  }

  function exportIcs() {
    const out: IcsEvent[] = events.map((ev) => ({
      id: ev.id,
      summary: ev.title,
      startDate: eventDateTime(ev),
      allDay: ev.time === '',
    }))
    saveText(toIcs(out), { filename: 'calendar.ics', mimeType: 'text/calendar' })
  }

  async function importIcs(file: File) {
    const result = await openFile(file, 'text')
    if (!result.ok) {
      setNotice('Could not read that file')
      return
    }
    const text = typeof result.data === 'string' ? result.data : String(result.data)
    if (!validateIcs(text)) {
      setNotice('That file is not a valid calendar file')
      return
    }
    let added = 0
    for (const ev of fromIcs(text)) {
      const title = ev.summary.trim()
      if (title === '' || !/^\d{4}-\d{2}-\d{2}/.test(ev.startDate)) continue
      if (events.some((e) => e.id === ev.id)) continue
      addEvent({ id: ev.id, title, date: ev.startDate.slice(0, 10), time: timeOf(ev.startDate) })
      added += 1
    }
    setEvents(listEvents())
    setNotice(added > 0 ? `Imported ${added} event${added === 1 ? '' : 's'}` : 'No new events found')
  }

  return (
    <>
      <input
        ref={importRef}
        type="file"
        accept=".ics,text/calendar"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void importIcs(file)
          e.target.value = ''
        }}
      />
      <AppShell
        name="Personal Calendar"
        icon="calendar"
        hue="teal"
        category="Productivity"
        meta={`${total} ${total === 1 ? 'event' : 'events'}`}
        status={notice ?? undefined}
      >
        <div className="cal-stack">
          <Card mono="Month" title={monthHeading(anchor)}>
            <div className="cal-card-stack">
              <div className="cal-toolbar">
                <div className="cal-nav">
                  <Button kind="ghost" onClick={() => shift(-1)}>
                    Previous month
                  </Button>
                  <Button kind="ghost" onClick={() => shift(1)}>
                    Next month
                  </Button>
                </div>
                <div className="cal-actions">
                  <Button kind="secondary" onClick={() => importRef.current?.click()}>
                    Import ICS
                  </Button>
                  <Button kind="secondary" onClick={exportIcs}>
                    Export ICS
                  </Button>
                  <PrimaryButton onClick={openForm}>Add event</PrimaryButton>
                </div>
              </div>
              <div className="cal-grid">
                {DAY_ABBR.map((d) => (
                  <div key={d} className="cal-grid-head">
                    {d}
                  </div>
                ))}
                {cells.map((c) => {
                  const dayEvents = byDay.get(c.iso) ?? []
                  const dayNum = Number(c.iso.slice(8, 10))
                    return (
                      <div
                        key={c.iso}
                        className={`cal-cell${c.inMonth ? '' : ' off'}${c.iso === TODAY ? ' today' : ''}`}
                      >
                        <div className="cal-cell-date">{c.inMonth ? dayNum : null}</div>
                        {dayEvents.map((ev) => (
                          <button
                            key={ev.id}
                            type="button"
                            className="cal-block"
                            title={ev.title}
                            onClick={() => setSelected(ev)}
                          >
                            {ev.title}
                          </button>
                        ))}
                      </div>
                    )
                })}
              </div>
            </div>
          </Card>

          <Card mono="This month" title="This month's events">
            {currentEvents.length === 0 ? (
              <div className="cal-month-empty">
                <div className="lc-mono lc-mono-sm lc-faint">Empty</div>
                <div className="lc-empty-title">No events this month</div>
                <div className="lc-body-sm">Add an event or import a calendar file to fill the grid.</div>
              </div>
            ) : (
              <>
              <div className="cal-list">
                {currentEvents.map((ev) => (
                  <div key={ev.id} className="cal-list-row">
                    <button type="button" className="cal-list-title" onClick={() => setSelected(ev)}>
                      {ev.title}
                    </button>
                    <span className="cal-list-date">{ev.date}</span>
                    <span className="cal-list-time">{ev.time === '' ? 'All day' : ev.time}</span>
                    <span className="cal-list-key">{ev.title}</span>
                  </div>
                ))}
              </div>
                <KpiRow>
                  <Kpi value={String(currentEvents.length)} label="Events this month" accent />
                </KpiRow>
              </>
            )}
          </Card>
        </div>

        {form !== null ? (
          <div className="cal-overlay" role="dialog" aria-modal="true" aria-label="New event">
            <div className="cal-dialog">
              <h2>New event</h2>
              <FormGrid>
                <TextInput
                  label="Title"
                  value={form.title}
                  onChange={(v) => setForm({ ...form, title: v })}
                  error={form.error}
                />
                <TextInput
                  label="Date"
                  type="date"
                  value={form.date}
                  onChange={(v) => setForm({ ...form, date: v })}
                />
                <TextInput
                  label="Time"
                  type="time"
                  value={form.time}
                  onChange={(v) => setForm({ ...form, time: v })}
                  hint="Leave blank for all day"
                />
              </FormGrid>
              <Actions>
                <PrimaryButton onClick={saveForm}>Save</PrimaryButton>
                <Button kind="ghost" onClick={() => setForm(null)}>
                  Cancel
                </Button>
              </Actions>
            </div>
          </div>
        ) : null}

        {selected !== null ? (
          <div className="cal-overlay" role="dialog" aria-modal="true" aria-label="Event details">
            <div className="cal-dialog">
              <h2>Event</h2>
              <div className="cal-detail">
                <div className="cal-detail-title">{selected.title}</div>
                <div className="cal-detail-rows">
                  {detailRows(selected).map(([label, value]) => (
                    <div key={label} className="cal-detail-row">
                      <span className="cal-detail-label">{label}</span>
                      <span className="cal-detail-value">{value}</span>
                    </div>
                  ))}
                </div>
                {selected.time !== '' ? <span className="cal-detail-key">{selected.time}</span> : null}
              </div>
              <Actions>
                <PrimaryButton onClick={deleteSelected}>Delete</PrimaryButton>
                <Button kind="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </Actions>
            </div>
          </div>
        ) : null}
      </AppShell>
    </>
  )
}

export { monthHeading }
