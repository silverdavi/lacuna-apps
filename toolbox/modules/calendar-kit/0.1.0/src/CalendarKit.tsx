// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calendar-kit 0.1.0: snapshot of lacuna-components CalendarKit at aba0238 by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '@lacuna/ui'
import { RecordForm } from '@lacuna/record-form'
import { fromIcs, toIcs, type IcsEvent } from '@lacuna/ics-calendar'
import { occurrencesBetween, type RecurrenceRule } from '@lacuna/recurrence'
import { addDays, addMonths, startOfWeek, toISODate, fromISODate } from '@lacuna/date-math'
import { CalendarMonth, type GridEvent } from './CalendarMonth'
import { CalendarWeek } from './CalendarWeek'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export interface KitEvent {
  id: string
  title: string
  date: string
  recurrence?: { date: string; frequency: RecurrenceFrequency; interval: number; endDate?: string; count?: number }
}

export interface CalendarKitProps {
  events?: KitEvent[]
  onEventsChange?: (events: KitEvent[]) => void
  showRecurrence?: boolean
  showIcs?: boolean
  style?: CSSProperties
}

const toRule = (ev: KitEvent): RecurrenceRule | null => {
  if (!ev.recurrence) return null
  const r = ev.recurrence
  return { frequency: r.frequency, interval: r.interval, startDate: r.date, endDate: r.endDate, maxOccurrences: r.count }
}

function toIcsEvent(ev: KitEvent): IcsEvent {
  const out: IcsEvent = { id: ev.id, summary: ev.title, startDate: ev.date, allDay: true }
  const r = toRule(ev)
  if (r) out.recurrence = { frequency: r.frequency, interval: r.interval, maxOccurrences: r.maxOccurrences, endDate: r.endDate }
  return out
}

const S: Record<string, CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', gap: 'calc(12px * var(--sf))', fontFamily: 'var(--sans)', color: 'var(--ink)', fontSize: 'calc(14px * var(--tf))' },
  toolbar: { display: 'flex', gap: 'calc(8px * var(--sf))', flexWrap: 'wrap' },
  panel: { border: 'calc(1px * var(--sf)) solid var(--hair)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(12px * var(--sf))', background: 'var(--paper-deep)' },
  formBox: { display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' },
  ics: { fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink)', background: 'var(--paper)', border: 'calc(1px * var(--sf)) solid var(--hair)', borderRadius: 'calc(4px * var(--sf))', padding: 'calc(8px * var(--sf))', width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 'calc(80px * var(--sf))' },
  primaryOverride: { background: 'var(--ink)', color: 'var(--paper)' },
}

export function CalendarKit({ events: propEvents, onEventsChange, showRecurrence = true, showIcs = true, style }: CalendarKitProps) {
  const [events, setEvents] = useState<KitEvent[]>(propEvents ?? [])
  const [view, setView] = useState<'month' | 'week'>('month')
  const [cursor, setCursor] = useState<string>(() => toISODate(new Date()))
  const [selected, setSelected] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [icsText, setIcsText] = useState('')
  const [icsError, setIcsError] = useState('')

  const parsed = fromISODate(cursor) ?? new Date()
  const rangeFrom = view === 'month' ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : startOfWeek(parsed, 1)
  const rangeTo = view === 'month' ? new Date(parsed.getFullYear(), parsed.getMonth() + 1, 0) : addDays(startOfWeek(parsed, 1), 6)
  const fromISO = toISODate(rangeFrom)
  const toISO = toISODate(rangeTo)

  const visible: GridEvent[] = useMemo(() => {
    const out: GridEvent[] = []
    for (const ev of events) {
      out.push({ date: ev.date, title: ev.title })
      if (showRecurrence) {
        const rule = toRule(ev)
        if (rule) for (const iso of occurrencesBetween(rule, fromISO, toISO)) out.push({ date: iso, title: ev.title })
      }
    }
    return out
  }, [events, showRecurrence, fromISO, toISO])

  const formDate = selected ?? cursor
  const editing = editingId ? (events.find((e) => e.id === editingId) ?? null) : null

  const openForm = (date: string, id: string | null): void => {
    setSelected(date)
    setEditingId(id)
    setFormOpen(true)
  }

  const closeForm = (): void => {
    setFormOpen(false)
    setSelected(null)
    setEditingId(null)
  }

  const fields = [
    { name: 'title', label: 'Title', type: 'text' as const, required: true },
    ...(showRecurrence
      ? [
          { name: 'freq', label: 'Frequency', type: 'select' as const, options: ['daily', 'weekly', 'monthly', 'yearly'] },
          { name: 'interval', label: 'Interval', type: 'number' as const, min: 1 },
           { name: 'until', label: 'End date', type: 'text' as const },
        ]
      : []),
  ]

  const submit = (values: Record<string, string | number>): void => {
    const title = String(values.title ?? '').trim()
    if (!title) return
    const base: KitEvent = { id: editingId ?? `evt-${Date.now()}`, title, date: formDate }
    if (showRecurrence && values.freq) {
      const interval = Number(values.interval)
      base.recurrence = { date: formDate, frequency: values.freq as RecurrenceFrequency, interval: Number.isFinite(interval) && interval >= 1 ? interval : 1, endDate: values.until ? String(values.until) : undefined }
    }
    const next = editing ? events.map((e) => (e.id === editing.id ? base : e)) : [...events, base]
    setEvents(next)
    onEventsChange?.(next)
    closeForm()
  }

  const runIcs = (direction: 'import' | 'export'): void => {
    if (direction === 'export') {
      setIcsText(toIcs(events.map(toIcsEvent)))
      setIcsError('')
      return
    }
    try {
      const imported = fromIcs(icsText)
      const mapped: KitEvent[] = imported.map((ev, i) => {
        const out: KitEvent = { id: ev.id || `imported-${i}`, title: ev.summary || 'Imported', date: ev.startDate.slice(0, 10) }
        if (ev.recurrence) out.recurrence = { date: ev.startDate.slice(0, 10), frequency: ev.recurrence.frequency, interval: ev.recurrence.interval, endDate: ev.recurrence.endDate, count: ev.recurrence.maxOccurrences }
        return out
      })
      setEvents((cur) => {
        const next = [...cur, ...mapped]
        onEventsChange?.(next)
        return next
      })
      setIcsError('')
    } catch {
      setIcsError('Invalid ICS text')
    }
  }

  const prev = (): void => setCursor(toISODate(addMonths(rangeFrom, -1)))
  const next = (): void => setCursor(toISODate(addMonths(rangeFrom, 1)))

  return (
    <section role="region" aria-label="Calendar" style={{ ...S.root, ...style }}>
      <div style={S.toolbar}>
        <Button kind={view === 'month' ? 'primary' : 'secondary'} style={view === 'month' ? S.primaryOverride : undefined} onClick={() => setView('month')}>Month</Button>
        <Button kind={view === 'week' ? 'primary' : 'secondary'} style={view === 'week' ? S.primaryOverride : undefined} onClick={() => setView('week')}>Week</Button>
        <Button ariaLabel="Previous" onClick={prev}>‹</Button>
        <Button ariaLabel="Next" onClick={next}>›</Button>
        <Button onClick={() => setCursor(toISODate(new Date()))}>Today</Button>
        <Button kind="primary" style={S.primaryOverride} ariaLabel="Add Event" onClick={() => openForm(formDate, null)}>Add Event</Button>
      </div>
      {view === 'month' ? (
        <CalendarMonth value={cursor} events={visible} onSelect={(iso) => openForm(iso, null)} onMonthChange={(iso) => { setCursor(iso); closeForm() }} />
      ) : (
        <CalendarWeek value={cursor} events={visible} onSelect={(iso) => openForm(iso, null)} onWeekChange={(iso) => { setCursor(iso); closeForm() }} />
      )}
      {formOpen && (
        <div style={S.panel}>
          <div style={S.formBox}>
            <h3 style={{ margin: 0, fontSize: 'calc(14px * var(--tf))', fontWeight: 600, color: 'var(--ink)' }}>{editing ? 'Edit Event' : 'New Event'}</h3>
            <RecordForm
              fields={fields}
              initialValues={editing ? { title: editing.title, freq: editing.recurrence?.frequency ?? '', interval: editing.recurrence?.interval ?? '', until: editing.recurrence?.endDate ?? '' } : { title: '', freq: '', interval: 1, until: '' }}
              onSubmit={submit}
              submitLabel="Save"
              cancelLabel="Cancel"
              onCancel={closeForm}
            />
          </div>
        </div>
      )}
      {showIcs && (
        <div style={S.panel}>
          <div style={S.formBox}>
            <h3 style={{ margin: 0, fontSize: 'calc(14px * var(--tf))', fontWeight: 600, color: 'var(--ink)' }}>iCalendar</h3>
            <div style={S.toolbar}>
              <Button onClick={() => runIcs('import')}>Import ICS</Button>
              <Button onClick={() => runIcs('export')}>Export ICS</Button>
            </div>
            <textarea style={S.ics} aria-label="ICS content" value={icsText} onChange={(e) => setIcsText(e.target.value)} rows={4} />
            {icsError ? <span role="alert" style={{ color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))' }}>{icsError}</span> : null}
          </div>
        </div>
      )}
    </section>
  )
}

export type { KitEvent as CalendarEvent }
