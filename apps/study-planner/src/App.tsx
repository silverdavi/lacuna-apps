// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useMemo, useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  Kpi,
  KpiRow,
  PrimaryButton,
  Stack,
  TextInput,
  type IconName,
  ICONS,
} from '@lacuna/ui'
import { addDays, fromISODate, startOfWeek, toISODate } from '@lacuna/date-math'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { addSession, listSessions, removeSession, updateSession, type Session } from './host'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

function fmtTime(mins: number): string {
  return `${pad2(Math.floor(mins / 60) % 24)}:${pad2(mins % 60)}`
}

function sessionTime(s: Session): string {
  const start = toMinutes(s.start)
  return `${fmtTime(start)}-${fmtTime(start + s.duration)}`
}

function weekdayName(d: Date): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()]
}

export function App() {
  const [sessions, setSessions] = useState<Session[]>(() => listSessions())
  const [view, setView] = useState<'Month' | 'Week'>('Month')
  const [anchor, setAnchor] = useState<Date>(() => fromISODate('2024-05-15') ?? new Date())
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [date, setDate] = useState('2024-05-15')
  const [start, setStart] = useState('14:00')
  const [duration, setDuration] = useState('60')
  const [repeat, setRepeat] = useState(false)

  const { copy, copied } = useClipboard({ timeoutMs: 1500 })

  const refresh = (fn: () => void) => {
    fn()
    setSessions(listSessions())
  }

  const month = useMemo(() => {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
    const start = startOfWeek(first, 1)
    const days: Date[] = []
    for (let i = 0; i < 42; i++) days.push(addDays(start, i))
    return { first, days }
  }, [anchor])

  const week = useMemo(() => {
    const start = startOfWeek(anchor, 1)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) days.push(addDays(start, i))
    return days
  }, [anchor])

  const total = sessions.length
  const doneCount = sessions.filter((s) => s.done).length

  const selectedSession = sessions.find((s) => s.id === selected) ?? null

  function openForm() {
    setSubject('')
    setDate('2024-05-15')
    setStart('14:00')
    setDuration('60')
    setRepeat(false)
    setSelected(null)
    setFormOpen(true)
  }

  function save() {
    const dur = Number(duration)
    if (!subject.trim() || !date || !/^\d{2}:\d{2}$/.test(start) || !dur || dur <= 0) return
    refresh(() => {
      addSession({ subject: subject.trim(), date, start, duration: dur, done: false })
      if (repeat) {
        const d = fromISODate(date)
        if (d) addSession({ subject: subject.trim(), date: toISODate(addDays(d, 7)), start, duration: dur, done: false })
      }
    })
    setFormOpen(false)
  }

  function toggleDone(id: string) {
    const s = sessions.find((x) => x.id === id)
    if (!s) return
    refresh(() => updateSession(id, { done: !s.done }))
  }

  function remove(id: string) {
    refresh(() => removeSession(id))
    setSelected(null)
  }

  function exportIcs() {
    const events: IcsEvent[] = sessions.map((s) => {
      const m = toMinutes(s.start)
      const compact = (mins: number) => `${s.date.replace(/-/g, '')}T${fmtTime(mins).replace(':', '')}:00`
      return {
        id: s.id,
        summary: s.subject,
        startDate: `${s.date}T${s.start}:00`,
        endDate: compact(m + s.duration),
        allDay: false,
      }
    })
    void copy(toIcs(events))
  }

  const daySessions = (d: Date) => sessions.filter((s) => s.date === toISODate(d))

  function gridDay(d: Date) {
    const iso = toISODate(d)
    const inMonth = d.getMonth() === month.first.getMonth()
    const sel = daySessions(d)
    return (
      <div
        key={iso}
        style={{ cursor: sel.length ? 'pointer' : undefined }}
        onClick={() => sel.length > 0 && setSelected(sel[0].id)}
        data-day={iso}
      >
        <div style={{ fontSize: 11, color: inMonth ? 'var(--ink)' : 'var(--ink-60)', marginBottom: 4 }}>
          <span>{d.getDate()}</span>
          {sel.length > 0 && <span style={{ display: 'block', fontSize: 10, color: 'var(--ink-60)' }}>{MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()}, {d.getFullYear()}</span>}
        </div>
        {sel.map((s) => (
          <button
            type="button"
            key={s.id}
            onClick={(e) => {
              e.stopPropagation()
              setSelected(s.id)
              setFormOpen(false)
            }}
            className="lc-cal-event"
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5 }}
          >
            {s.done && <ICONS.tasks size={10} title="checkmark" />}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.subject} {sessionTime(s)}
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <AppShell name="Study Planner">
      <Stack lg>
        <KpiRow>
          <Kpi value={`Completed: ${doneCount} of ${total}`} label="Progress" accent />
        </KpiRow>

        <div className="lc-tabs">
          {(['Month', 'Week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-selected={view === v}
              className={v === view ? 'lc-tab active' : 'lc-tab'}
              style={v !== view ? { color: 'var(--ink-60)' } : undefined}
              onClick={() => {
                setView(v)
                setFormOpen(false)
                setSelected(null)
              }}
            >
              {v}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button aria-label="Previous period" onClick={() => setAnchor(addDays(view === 'Month' ? month.first : week[0], view === 'Month' ? -1 : -7))}>
            ‹
          </Button>
          <span style={{ fontSize: 13, color: 'var(--ink-80)', minWidth: 120, textAlign: 'center' }}>
            {view === 'Month'
              ? `${MONTHS[month.first.getMonth()]} ${month.first.getFullYear()}`
              : `${MONTHS[week[0].getMonth()].slice(0, 3)} ${week[0].getDate()} – ${MONTHS[week[6].getMonth()].slice(0, 3)} ${week[6].getDate()}`}
          </span>
          <Button aria-label="Next period" onClick={() => setAnchor(addDays(view === 'Month' ? month.first : week[0], view === 'Month' ? 1 : 7))}>
            ›
          </Button>
          <Button onClick={exportIcs}>{copied ? 'Copied' : 'Export ICS'}</Button>
          <PrimaryButton onClick={openForm}>New session</PrimaryButton>
        </div>

        {formOpen && (
          <Card title="New session">
            <FormGrid>
              <TextInput label="Subject" value={subject} onChange={(v: string) => setSubject(v)} placeholder="Math" />
              <TextInput label="Date" value={date} onChange={(v: string) => setDate(v)} placeholder="2024-05-15" />
              <TextInput label="Start time" value={start} onChange={(v: string) => setStart(v)} placeholder="14:00" />
              <TextInput label="Duration" value={duration} onChange={(v: string) => setDuration(v)} placeholder="60" />
              <Checkbox checked={repeat} onChange={(c: boolean) => setRepeat(c)} label="Repeat weekly" />
            </FormGrid>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <Button onClick={() => setFormOpen(false)}>Cancel</Button>
              <PrimaryButton onClick={save}>Save</PrimaryButton>
            </div>
          </Card>
        )}

        {selectedSession && (
          <Card
            title={selectedSession.subject}
            actions={
              selectedSession.done ? (
                <button
                  type="button"
                  disabled
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontSize: 12, fontWeight: 600, border: 'none', background: 'none', cursor: 'default' }}
                >
                  <ICONS.tasks size={13} title="checkmark" />
                  Done
                </button>
              ) : undefined
            }
          >
            <div style={{ fontSize: 13, color: 'var(--ink-80)', marginBottom: 12 }}>
              {weekdayName(fromISODate(selectedSession.date) ?? new Date())},{' '}
              {MONTHS[(fromISODate(selectedSession.date) ?? new Date()).getMonth()]}{' '}
              {(fromISODate(selectedSession.date) ?? new Date()).getDate()},{' '}
              {(fromISODate(selectedSession.date) ?? new Date()).getFullYear()}
              <span style={{ color: 'var(--ink-60)' }}> · </span>
              {sessionTime(selectedSession)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <PrimaryButton onClick={() => toggleDone(selectedSession.id)}>
                {selectedSession.done ? 'Reset' : 'Mark done'}
              </PrimaryButton>
              <Button onClick={() => remove(selectedSession.id)}>Delete</Button>
            </div>
          </Card>
        )}

        {view === 'Month' ? (
          <Card title={`${MONTHS[month.first.getMonth()]} ${month.first.getFullYear()}`} flush>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, fontSize: 12 }}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} style={{ padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))', color: 'var(--ink-80)', fontWeight: 600, borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)', fontSize: 11 }}>
                  {d}
                </div>
              ))}
              {month.days.map(gridDay)}
            </div>
          </Card>
        ) : (
          <Card title={`Week of ${MONTHS[week[0].getMonth()].slice(0, 3)} ${week[0].getDate()}`} flush>
            <div style={{ borderTop: 'calc(1px * var(--sf)) solid var(--ui-line)' }}>
              {week.map((d) => {
                const iso = toISODate(d)
                const sel = daySessions(d)
                return (
                  <div key={iso} style={{ borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)', padding: 'calc(10px * var(--sf)) calc(12px * var(--sf))' }} data-day={iso}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6, width: '100%' }}>
                      {weekdayName(d)}, {MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()}, {d.getFullYear()}
                    </div>
                    {sel.length === 0 && <div style={{ fontSize: 11, color: 'var(--ink-60)' }}>No sessions</div>}
                    {sel.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          setSelected(s.id)
                          setFormOpen(false)
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: 'calc(6px * var(--sf)) calc(10px * var(--sf))', background: 'var(--paper-deep)', border: 'none', borderRadius: 4, cursor: 'pointer', textAlign: 'left', fontSize: 12, color: 'var(--ink)' }}
                      >
                        {s.done && <ICONS.tasks size={11} title="checkmark" />}
                        <span>{s.subject} {sessionTime(s)}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {sessions.length === 0 && <EmptyState mono="Empty" title="No study sessions yet." detail="Plan a study session to start tracking your progress." actionLabel="New session" />}
      </Stack>
    </AppShell>
  )
}
