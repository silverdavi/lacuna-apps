// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calendar-kit 0.1.0: snapshot of lacuna-components CalendarKit at aba0238 by sync-toolbox-components.py; a change gets a new version.
import { useMemo } from 'react'
import type { CSSProperties, ReactElement } from 'react'
import { addDays, addWeeks, fromISODate, startOfWeek, toISODate } from '@lacuna/date-math'
import type { GridEvent } from './CalendarMonth'

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const S: Record<string, CSSProperties> = {
  wrap: { fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: 600 },
  nav: { fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', padding: 'calc(4px * var(--sf)) calc(10px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer', borderRadius: 'calc(2px * var(--sf))' },
  row: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(1px * var(--sf))' },
  cell: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 'calc(2px * var(--sf))', padding: 'calc(6px * var(--sf))', height: 'calc(96px * var(--sf))', cursor: 'pointer', userSelect: 'none', border: 'calc(1px * var(--sf)) solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', textAlign: 'left', overflow: 'hidden', boxSizing: 'border-box', borderRadius: 'calc(2px * var(--sf))' },
  day: { display: 'flex', alignItems: 'baseline', gap: 'calc(4px * var(--sf))' },
  name: { fontSize: 'calc(11px * var(--tf))', fontFamily: 'var(--mono)', color: 'var(--ink)' },
  num: { fontSize: 'calc(14px * var(--tf))', fontWeight: 600 },
  event: { fontSize: 'calc(11px * var(--tf))', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', position: 'absolute', bottom: 'calc(4px * var(--sf))', left: 'calc(6px * var(--sf))', right: 'calc(6px * var(--sf))' },
}

export interface CalendarWeekProps {
  value: string
  events?: GridEvent[]
  onSelect?: (date: string) => void
  onWeekChange?: (date: string) => void
  today?: string
}

export function CalendarWeek({ value, events, onSelect, onWeekChange, today }: CalendarWeekProps): ReactElement {
  const eventMap = useMemo(() => {
    const map = new Map<string, GridEvent[]>()
    for (const ev of events ?? []) {
      const list = map.get(ev.date)
      if (list) list.push(ev)
      else map.set(ev.date, [ev])
    }
    return map
  }, [events])

  const anchor = fromISODate(value) ?? new Date()
  const todayISO = today ?? toISODate(new Date())
  const start = startOfWeek(anchor, 1)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const end = days[6] ?? anchor

  const fmt = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const label = `${fmt(start)} to ${fmt(end)}`

  return (
    <div style={S.wrap}>
      <div role="group" aria-label="Week navigation" style={S.head}>
        <button type="button" aria-label="Previous week" style={S.nav} onClick={() => onWeekChange?.(toISODate(addWeeks(start, -1)))}>‹</button>
        <span style={S.title}>{label}</span>
        <button type="button" aria-label="Next week" style={S.nav} onClick={() => onWeekChange?.(toISODate(addWeeks(start, 1)))}>›</button>
      </div>
      <div role="grid" aria-label={label}>
        <div role="row" style={S.row}>
          {days.map((date) => {
            const iso = toISODate(date)
            const dayEvents = eventMap.get(iso) ?? []
            return (
              <div
                key={iso}
                role="cell"
                aria-label={String(date.getDate())}
                onClick={() => onSelect?.(iso)}
                style={{ ...S.cell, ...(iso === todayISO ? { border: 'calc(2px * var(--sf)) solid var(--accent)' } : {}) }}
              >
                <span style={S.day}>
                  <span style={S.name}>{DAY_NAMES[(date.getDay() + 6) % 7] ?? ''}</span>
                  <span style={S.num}>{date.getDate()}</span>
                </span>
                {dayEvents.map((ev, j) => <span key={j} style={S.event} aria-hidden="true">{ev.title}</span>)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
