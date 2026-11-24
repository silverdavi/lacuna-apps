// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useEffect, useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  FormGrid,
  PrimaryButton,
  Select,
  TextInput,
} from '@lacuna/ui'
import { addDays, addMonths, fromISODate, startOfWeek, toISODate } from '@lacuna/date-math'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { saveText } from '@lacuna/file-save-open'
import {
  DAYS,
  addAppointment,
  getAvailability,
  listAppointments,
  removeAppointment,
  upsertAvailability,
  updateAppointment,
  type Appointment,
  type Availability,
  type Day,
} from './host'
import './app.css'

const DAY_ABBR = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAY_TO_ABBR: Record<Day, string> = {
  Sunday: 'Sun',
  Monday: 'Mon',
  Tuesday: 'Tue',
  Wednesday: 'Wed',
  Thursday: 'Thu',
  Friday: 'Fri',
  Saturday: 'Sat',
}

const WEEK_START_H = 7
const WEEK_END_H = 19
const DAY_MIN = (WEEK_END_H - WEEK_START_H) * 60

function parseHM(value: string): { h: number; m: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return { h: 0, m: 0 }
  return { h: Number(match[1]), m: Number(match[2]) }
}

function minutesOf(h: number, m: number): number {
  return h * 60 + m
}

function weekdayOfISO(iso: string): string {
  const d = fromISODate(iso)
  if (!d) return ''
  return DAY_ABBR[(d.getDay() + 6) % 7]
}

function startOfWeekISO(anchor: string): string {
  const d = fromISODate(anchor)
  if (!d) return anchor
  return toISODate(startOfWeek(d, 1))
}

function monthCells(anchor: string): { iso: string; inMonth: boolean }[] {
  const d = fromISODate(anchor)
  if (!d) return []
  const first = new Date(d.getFullYear(), d.getMonth(), 1)
  const start = startOfWeek(first, 1)
  const cells: { iso: string; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const cell = addDays(start, i)
    cells.push({
      iso: toISODate(cell),
      inMonth: cell.getMonth() === d.getMonth(),
    })
  }
  return cells
}

function earliestAnchor(list: Appointment[]): string | null {
  if (list.length === 0) return null
  let min = list[0].date
  for (const a of list) if (a.date < min) min = a.date
  return min
}

function weekDays(anchor: string): string[] {
  const start = startOfWeekISO(anchor)
  const base = fromISODate(start)
  if (!base) return []
  return Array.from({ length: 7 }, (_, i) => toISODate(addDays(base, i)))
}

function monthHeading(anchor: string): string {
  const d = fromISODate(anchor)
  if (!d) return ''
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function weekHeading(anchor: string): string {
  const days = weekDays(anchor)
  if (days.length !== 7) return ''
  const a = fromISODate(days[0])
  const b = fromISODate(days[6])
  if (!a || !b) return ''
  return `${a.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${b.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

interface DialogState {
  id: string | null
  name: string
  date: string
  start: string
  end: string
  notes: string
  error: string | null
}

function freshDialog(anchor: string): DialogState {
  return {
    id: null,
    name: '',
    date: anchor,
    start: '09:00',
    end: '10:00',
    notes: '',
    error: null,
  }
}

function dialogFrom(appt: Appointment): DialogState {
  return {
    id: appt.id,
    name: appt.name,
    date: appt.date,
    start: appt.time,
    end: appt.end,
    notes: appt.notes,
    error: null,
  }
}

const TODAY = toISODate(new Date())

export function App() {
  const [appointments, setAppointments] = useState<Appointment[]>(() => listAppointments())
  const [availability, setAvailability] = useState<Availability>(() => getAvailability())
  const [tab, setTab] = useState<'Month' | 'Week' | 'Settings'>('Month')
  const [anchor, setAnchor] = useState<string>(() => {
    const list = listAppointments()
    const earliest = earliestAnchor(list)
    return earliest ?? TODAY
  })
  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [availDay, setAvailDay] = useState<Day>('Monday')
  const [availStart, setAvailStart] = useState('08:00')
  const [availEnd, setAvailEnd] = useState('17:00')
  const [availSaved, setAvailSaved] = useState<string | null>(null)

  useEffect(() => {
    const map = getAvailability()
    const entries = Object.entries(map) as [Day, string][]
    if (entries.length > 0) {
      const [day, range] = entries[0]
      setAvailDay(day)
      const [s, e] = range.split('–')
      if (s && e) {
        setAvailStart(s)
        setAvailEnd(e)
      }
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return appointments
    return appointments.filter((a) => a.name.toLowerCase().includes(q))
  }, [appointments, search])

  const byDay = useMemo(() => {
    const map = new Map<string, Appointment[]>()
    for (const a of filtered) {
      const list = map.get(a.date) ?? []
      list.push(a)
      map.set(a.date, list)
    }
    return map
  }, [filtered])

  const monthCount = useMemo(() => {
    let n = 0
    for (const a of filtered) {
      if (a.date.startsWith(anchor.slice(0, 7))) n++
    }
    return n
  }, [filtered, anchor])

  function refresh() {
    setAppointments(listAppointments())
  }

  function shift(offset: number) {
    const d = fromISODate(anchor)
    if (!d) return
    if (tab === 'Month') {
      const next = addMonths(d, offset)
      setAnchor(toISODate(next))
    } else {
      setAnchor(toISODate(addDays(d, offset * 7)))
    }
  }

  function saveDialog() {
    if (!dialog) return
    const name = dialog.name.trim()
    if (!name) return setDialog({ ...dialog, error: 'Client name is required' })
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dialog.date)) return setDialog({ ...dialog, error: 'Pick a valid date' })
    const s = parseHM(dialog.start)
    const e = parseHM(dialog.end)
    if (minutesOf(e.h, e.m) <= minutesOf(s.h, s.m)) {
      return setDialog({ ...dialog, error: 'End time must be after the start time' })
    }
    const input = {
      name,
      date: dialog.date,
      time: dialog.start,
      end: dialog.end,
      notes: dialog.notes.trim(),
    }
    if (dialog.id) {
      updateAppointment(dialog.id, input)
    } else {
      addAppointment(input)
      const d = fromISODate(input.date)
      if (d) setAnchor(toISODate(d))
    }
    refresh()
    setDialog(null)
  }

  function deleteFromDialog() {
    if (!dialog?.id) return
    removeAppointment(dialog.id)
    refresh()
    setDialog(null)
  }

  function saveAvailability() {
    const s = parseHM(availStart)
    const e = parseHM(availEnd)
    if (minutesOf(e.h, e.m) <= minutesOf(s.h, s.m)) {
      setAvailSaved(null)
      return
    }
    upsertAvailability(availDay, `${availStart}–${availEnd}`)
    setAvailability(getAvailability())
    setAvailSaved(availDay)
  }

  function exportIcs() {
    const events: IcsEvent[] = []
    for (const a of appointments) {
      const start = fromISODate(a.date)
      if (!start) continue
      const s = parseHM(a.time)
      const e = parseHM(a.end)
      const startDt = new Date(start.getFullYear(), start.getMonth(), start.getDate(), s.h, s.m, 0, 0)
      const endDt = new Date(start.getFullYear(), start.getMonth(), start.getDate(), e.h, e.m, 0, 0)
      const p = (n: number) => String(n).padStart(2, '0')
      const fmt = (d: Date) => `${toISODate(d)}T${p(d.getHours())}:${p(d.getMinutes())}:00`
      events.push({
        id: a.id,
        summary: a.name,
        description: a.notes || undefined,
        startDate: fmt(startDt),
        endDate: fmt(endDt),
        allDay: false,
      })
    }
    saveText(toIcs(events), { filename: 'appointments.ics', mimeType: 'text/calendar' })
  }

  const cells = useMemo(() => monthCells(anchor), [anchor])
  const days = useMemo(() => weekDays(anchor), [anchor])
  const total = appointments.length

  return (
    <AppShell
      name="Appointment Booking"
      icon="calendar"
      hue="blue"
      category="Productivity"
      meta={`${total} ${total === 1 ? 'appointment' : 'appointments'}`}
    >
      <div className="ab-toolbar">
        <div className="ab-nav">
          <Button kind="ghost" ariaLabel="Previous" onClick={() => shift(-1)}>
            ‹
          </Button>
          <h2 className="ab-period">{tab === 'Month' ? monthHeading(anchor) : weekHeading(anchor)}</h2>
          <Button kind="ghost" ariaLabel="Next" onClick={() => shift(1)}>
            ›
          </Button>
          <Button kind="ghost" onClick={() => setAnchor(TODAY)}>
            Today
          </Button>
        </div>
        <div className="ab-actions">
          <TextInput
            label="Search appointments"
            type="search"
            value={search}
            onChange={setSearch}
          />
          <Button kind="secondary" onClick={exportIcs}>
            Export ICS
          </Button>
          <PrimaryButton ariaLabel="New appointment" onClick={() => setDialog(freshDialog(anchor))}>
            New
          </PrimaryButton>
        </div>
      </div>

      <div className="ab-tabs" role="tablist" aria-label="Views">
        {(['Month', 'Week', 'Settings'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className="ab-tab"
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

      {tab === 'Month' ? (
        <div role="tabpanel" aria-label="Month">
          <Card mono={`${monthCount} this month`} title="Month">
            <div className="ab-grid">
              {DAY_ABBR.map((d) => (
                <div key={d} className="ab-grid-head">
                  {d}
                </div>
              ))}
              {cells.map((c) => {
                const appts = byDay.get(c.iso) ?? []
                return (
                  <div
                    key={c.iso}
                    className={`ab-cell${c.inMonth ? '' : ' off'}${c.iso === TODAY ? ' today' : ''}`}
                  >
                    <span className="ab-cell-date">{Number(c.iso.slice(8, 10))}</span>
                    {appts.length > 0 ? (
                      <div className="ab-blocks">
                        {appts.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className="ab-block"
                            onClick={() => setDialog(dialogFrom(a))}
                          >
                            {a.name}
                          </button>
                        ))}
                        {appts.length > 1 ? (
                          <span className="ab-more">+{appts.length - 1}</span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {search.trim() ? (
              filtered.length === 0 ? (
                <p className="ab-nomatch">No appointments match</p>
              ) : null
            ) : total === 0 ? (
              <EmptyState
                mono="0"
                title="No appointments yet"
                detail="Book the first one."
                actionLabel="New appointment"
              />
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === 'Week' ? (
        <div role="tabpanel" aria-label="Week">
          <Card mono={weekHeading(anchor)} title="Week">
            <div className="ab-week">
              <div className="ab-week-gutter">
                {Array.from({ length: WEEK_END_H - WEEK_START_H }, (_, i) => WEEK_START_H + i).map((h) => (
                  <span key={h} className="ab-hour">
                    {String(h).padStart(2, '0')}
                  </span>
                ))}
              </div>
              {days.map((iso) => {
                const appts = appointments
                  .filter((a) => a.date === iso)
                  .sort((a, b) => a.time.localeCompare(b.time))
                return (
                  <div key={iso} className={`ab-day${iso === TODAY ? ' today' : ''}`}>
                    <div className="ab-day-head">
                      {WEEKDAY_TO_ABBR[weekdayOfISO(iso) as Day] ?? ''} {Number(iso.slice(8, 10))}
                    </div>
                    <div className="ab-day-canvas">
                      {appts.map((a) => {
                        const s = parseHM(a.time)
                        const e = parseHM(a.end)
                        const top = ((minutesOf(s.h, s.m) - WEEK_START_H * 60) / DAY_MIN) * 100
                        const height = ((minutesOf(e.h, e.m) - minutesOf(s.h, s.m)) / DAY_MIN) * 100
                        return (
                          <button
                            key={a.id}
                            type="button"
                            className="ab-wblock"
                            style={{ top: `${top}%`, height: `${height}%` }}
                            onClick={() => setDialog(dialogFrom(a))}
                          >
                            <span className="ab-wtime">
                              {a.time} – {a.end}
                            </span>
                            <span className="ab-wname">{a.name}</span>
                            {a.notes ? <span className="ab-wnotes">{a.notes}</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {total === 0 ? (
              <EmptyState
                mono="0"
                title="No appointments yet"
                detail="Book the first one."
                actionLabel="New appointment"
              />
            ) : null}
          </Card>
        </div>
      ) : null}

      {tab === 'Settings' ? (
        <div role="tabpanel" aria-label="Settings">
          <Card mono="Weekly hours" title="Availability">
            <FormGrid>
              <Select
                label="Day of week"
                value={availDay}
                onChange={(v) => setAvailDay(v as Day)}
                options={DAYS}
              />
              <TextInput label="Start time" type="time" value={availStart} onChange={setAvailStart} />
              <TextInput label="End time" type="time" value={availEnd} onChange={setAvailEnd} />
            </FormGrid>
            <div className="ab-actions">
              <Button kind="primary" onClick={saveAvailability}>
                Save availability
              </Button>
            </div>
            {availSaved ? (
              <p role="status" className="ab-saved">
                Availability saved for {availSaved}
              </p>
            ) : null}
          </Card>
        </div>
      ) : null}

      {dialog ? (
        <div className="ab-overlay" role="dialog" aria-modal="true" aria-label="Appointment">
          <div className="ab-dialog">
            <h2>{dialog.id ? 'Appointment' : 'Add appointment'}</h2>
            <div className="ab-detail">
              <div>{`Client name: ${dialog.name || '—'}`}</div>
              <div>{`Date: ${dialog.date}`}</div>
              <div>{`Start time: ${dialog.start}`}</div>
              <div>{`End time: ${dialog.end}`}</div>
              <div>{`Notes: ${dialog.notes || '—'}`}</div>
            </div>
            <FormGrid>
              <TextInput
                label="Client name"
                value={dialog.name}
                onChange={(v) => setDialog({ ...dialog, name: v })}
              />
              <TextInput
                label="Date"
                type="date"
                value={dialog.date}
                onChange={(v) => setDialog({ ...dialog, date: v })}
              />
              <TextInput
                label="Start time"
                type="time"
                value={dialog.start}
                onChange={(v) => setDialog({ ...dialog, start: v })}
              />
              <TextInput
                label="End time"
                type="time"
                value={dialog.end}
                onChange={(v) => setDialog({ ...dialog, end: v })}
              />
              <TextInput
                label="Notes"
                value={dialog.notes}
                onChange={(v) => setDialog({ ...dialog, notes: v })}
              />
            </FormGrid>
            {dialog.error ? (
              <p role="alert" className="ab-error">
                {dialog.error}
              </p>
            ) : null}
            <div className="ab-actions">
              <Button kind="primary" onClick={saveDialog}>
                Save
              </Button>
              {dialog.id ? (
                <Button kind="danger" onClick={deleteFromDialog}>
                  Delete
                </Button>
              ) : null}
              <Button kind="ghost" onClick={() => setDialog(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  )
}
