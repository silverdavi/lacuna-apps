// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import {
  AppShell,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormGrid,
  MonoLabel,
  PrimaryButton,
  Stack,
  TextInput,
  ICONS,
} from '@lacuna/ui'
import { addDays, fromISODate, startOfWeek, toISODate } from '@lacuna/date-math'
import { toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { useClipboard } from '@lacuna/use-clipboard'
import { addSession, addRecurring, listSessions, removeRecurringPair, updateSession, type Session } from './host'

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
  const [form, setForm] = useState({ subject: '', date: '2024-05-15', start: '14:00', duration: '60' })
  const [repeat, setRepeat] = useState(false)

  const { copy } = useClipboard({ timeoutMs: 1500 })

  const refresh = (fn: () => void) => {
    fn()
    setSessions(listSessions())
  }

  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1)
  const monthDays = (() => {
    const start = startOfWeek(first, 1)
    const days: Date[] = []
    for (let i = 0; i < 42; i++) days.push(addDays(start, i))
    return days
  })()

  const week = (() => {
    const start = startOfWeek(anchor, 1)
    const days: Date[] = []
    for (let i = 0; i < 7; i++) days.push(addDays(start, i))
    return days
  })()

  const total = sessions.filter((s) => !s.twinOf).length
  const doneCount = sessions.filter((s) => s.done && !s.twinOf).length

  const selectedSession = sessions.find((s) => s.id === selected) ?? null

  function openForm() {
    setForm({ subject: '', date: '2024-05-15', start: '14:00', duration: '60' })
    setRepeat(false)
    setSelected(null)
    setFormOpen(true)
  }

  function save() {
    const dur = Number(form.duration)
    if (!form.subject.trim() || !form.date || !/^\d{2}:\d{2}$/.test(form.start) || !dur || dur <= 0) return
    refresh(() => {
      const d = fromISODate(form.date)
      if (repeat && d) {
        addRecurring({
          primary: { subject: form.subject.trim(), date: form.date, start: form.start, duration: dur, done: false },
          twin: { subject: form.subject.trim(), date: toISODate(addDays(d, 7)), start: form.start, duration: dur, done: false },
        })
      } else {
        addSession({ subject: form.subject.trim(), date: form.date, start: form.start, duration: dur, done: false })
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
    refresh(() => removeRecurringPair(id))
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

  const daySessions = (d: Date) => sessions.filter((s) => s.date === toISODate(d)).sort((a, b) => a.start.localeCompare(b.start))

  function sessionChip(s: Session) {
    return (
      <span
        key={s.id}
        onClick={() => {
          setSelected(s.id)
          setFormOpen(false)
        }}
        style={{ display: 'block', cursor: 'pointer', marginTop: 4 }}
        className="lc-cal-event"
      >
        {s.done && <ICONS.tasks size={10} />}
        <span>{s.subject} {sessionTime(s)}</span>
      </span>
    )
  }

  return (
    <AppShell name="Study Planner">
      <Stack lg>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 'calc(11px * var(--tf))', letterSpacing: 'calc(0.9px * var(--tf))', color: 'var(--ink-80)' }}>
          Completed: {doneCount} of {total}
        </span>

        <div role="tablist" aria-label="Views" style={{ display: 'flex', gap: 'calc(20px * var(--sf))', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)', marginBottom: 'calc(10px * var(--sf))' }}>
          {(['Month', 'Week'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={view === t}
              onClick={() => { setView(t); setFormOpen(false); setSelected(null) }}
              style={{
                fontFamily: 'var(--sans)',
                fontSize: 'calc(12.5px * var(--tf))',
                fontWeight: 600,
                color: view === t ? 'var(--ink)' : 'var(--ink-80)',
                padding: '0 calc(2px * var(--sf)) calc(11px * var(--sf))',
                border: 'none',
                background: 'none',
                borderBottom: `calc(2px * var(--sf)) solid ${view === t ? 'var(--accent)' : 'transparent'}`,
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Button kind="ghost" ariaLabel="Previous period" onClick={() => setAnchor(addDays(view === 'Month' ? first : week[0], view === 'Month' ? -1 : -7))}>
            ‹
          </Button>
          <span style={{ fontSize: 13, color: 'var(--ink-80)', minWidth: 120, textAlign: 'center' }}>
            {view === 'Month'
              ? `${MONTHS[first.getMonth()]} ${first.getFullYear()}`
              : `${MONTHS[week[0].getMonth()].slice(0, 3)} ${week[0].getDate()} – ${MONTHS[week[6].getMonth()].slice(0, 3)} ${week[6].getDate()}`}
          </span>
          <Button kind="ghost" ariaLabel="Next period" onClick={() => setAnchor(addDays(view === 'Month' ? first : week[0], view === 'Month' ? 1 : 7))}>
            ›
          </Button>
          <Button onClick={exportIcs}>Export ICS</Button>
          <PrimaryButton onClick={openForm}>New session</PrimaryButton>
        </div>

        {formOpen && (
          <Card title="New session">
            <FormGrid>
              <TextInput label="Subject" value={form.subject} onChange={(v: string) => setForm((f) => ({ ...f, subject: v }))} placeholder="Math" />
              <TextInput label="Date" value={form.date} onChange={(v: string) => setForm((f) => ({ ...f, date: v }))} placeholder="2024-05-15" />
              <TextInput label="Start time" value={form.start} onChange={(v: string) => setForm((f) => ({ ...f, start: v }))} placeholder="14:00" />
              <TextInput label="Duration" value={form.duration} onChange={(v: string) => setForm((f) => ({ ...f, duration: v }))} placeholder="60" />
              <Checkbox checked={repeat} onChange={(c: boolean) => setRepeat(c)} label="Repeat weekly" />
            </FormGrid>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <Button onClick={() => setFormOpen(false)}>Cancel</Button>
              <PrimaryButton onClick={save}>Save</PrimaryButton>
            </div>
          </Card>
        )}

        {selectedSession && (
          <Card title={selectedSession.subject}>
            <div style={{ fontSize: 13, color: 'var(--ink-80)', marginBottom: 12 }}>
              {weekdayName(fromISODate(selectedSession.date) ?? new Date())},{' '}
              {MONTHS[(fromISODate(selectedSession.date) ?? new Date()).getMonth()]}{' '}
              {(fromISODate(selectedSession.date) ?? new Date()).getDate()},{' '}
              {(fromISODate(selectedSession.date) ?? new Date()).getFullYear()}
              <span style={{ color: 'var(--ink-60)' }}> · </span>
              {sessionTime(selectedSession)}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <PrimaryButton onClick={() => toggleDone(selectedSession.id)}>
                {selectedSession.done ? 'Reset' : 'Mark done'}
              </PrimaryButton>
              <Button onClick={() => remove(selectedSession.id)}>Delete</Button>
              {selectedSession.done && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                  <ICONS.tasks size={13} title="Checkmark" />
                  Done
                </span>
              )}
            </div>
          </Card>
        )}

        {view === 'Month' ? (
          <Card title={`${MONTHS[first.getMonth()]} ${first.getFullYear()}`} flush>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <th
                      key={d}
                      style={{ padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))', color: 'var(--ink-80)', fontWeight: 600, borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)', fontSize: 11, textAlign: 'left' }}
                    >
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }, (_, r) => (
                  <tr key={r}>
                    {monthDays.slice(r * 7, r * 7 + 7).map((d) => {
                      const iso = toISODate(d)
                      const inMonth = d.getMonth() === first.getMonth()
                      const sel = daySessions(d)
                      return (
                        <td
                          key={iso}
                          aria-label={`${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`}
                           style={{ padding: 'calc(5px * var(--sf)) calc(6px * var(--sf))', verticalAlign: 'top', borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line2)', cursor: sel.length ? 'pointer' : undefined }}
                          data-day={iso}
                          onClick={() => sel.length > 0 && setSelected(sel[0].id)}
                        >
                          <span style={{ fontSize: 11, color: inMonth ? 'var(--ink-80)' : 'var(--ink-60)', fontWeight: inMonth ? 400 : 600 }}>{d.getDate()}</span>
                          {sel.map(sessionChip)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ) : (
          <Card title={`Week of ${MONTHS[week[0].getMonth()].slice(0, 3)} ${week[0].getDate()}`} flush>
            <div style={{ borderTop: 'calc(1px * var(--sf)) solid var(--ui-line)' }}>
              {week.map((d) => {
                const iso = toISODate(d)
                const sel = daySessions(d)
                return (
                  <div key={iso} style={{ borderBottom: 'calc(1px * var(--sf)) solid var(--ui-line)', padding: 'calc(10px * var(--sf)) calc(12px * var(--sf))' }} data-day={iso}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                      {weekdayName(d)}, {MONTHS[d.getMonth()].slice(0, 3)} {d.getDate()}, {d.getFullYear()}
                    </div>
                    {sel.length === 0 && <div style={{ fontSize: 11, color: 'var(--ink-60)' }}>No sessions</div>}
                    {sel.map(sessionChip)}
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
