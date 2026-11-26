// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calendar-kit 0.1.0: snapshot of lacuna-components CalendarKit at aba0238 by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react'
import { addDays, addMonths, fromISODate, toISODate } from '@lacuna/date-math'

export interface GridEvent {
  date: string
  title: string
}

export interface CalendarMonthProps {
  value: string
  events?: GridEvent[]
  onSelect?: (date: string) => void
  onMonthChange?: (date: string) => void
  today?: string
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const S: Record<string, CSSProperties> = {
  wrap: { fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 'calc(8px * var(--sf))' },
  head: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontWeight: 600, color: 'var(--ink)' },
  nav: { fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', padding: 'calc(4px * var(--sf)) calc(10px * var(--sf))', border: 'calc(1px * var(--sf)) solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer', borderRadius: 'calc(2px * var(--sf))' },
  names: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(1px * var(--sf))' },
  name: { textAlign: 'center', fontSize: 'calc(11px * var(--tf))', fontFamily: 'var(--mono)', color: 'var(--ink)', padding: 'calc(4px * var(--sf)) 0', fontWeight: 600 },
  row: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(1px * var(--sf))' },
  cell: { position: 'relative', display: 'flex', flexDirection: 'column', gap: 'calc(2px * var(--sf))', height: 'calc(84px * var(--sf))', padding: 'calc(4px * var(--sf))', cursor: 'pointer', userSelect: 'none', border: 'calc(1px * var(--sf)) solid var(--hair)', background: 'var(--paper)', color: 'var(--ink)', textAlign: 'right', borderRadius: 'calc(2px * var(--sf))', boxSizing: 'border-box', overflow: 'hidden' },
  num: { fontSize: 'calc(12px * var(--tf))', fontWeight: 500, position: 'relative' },
  other: { color: 'var(--ink)' },
  event: { fontSize: 'calc(10px * var(--tf))', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', position: 'absolute', bottom: 'calc(2px * var(--sf))', left: 'calc(4px * var(--sf))', right: 'calc(4px * var(--sf))' },
}

export function CalendarMonth({ value, events, onSelect, onMonthChange, today }: CalendarMonthProps): ReactElement {
  const [activeIso, setActiveIso] = useState<string | null>(null)
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const eventMap = useMemo(() => {
    const map = new Map<string, GridEvent[]>()
    for (const ev of events ?? []) {
      const list = map.get(ev.date)
      if (list) list.push(ev)
      else map.set(ev.date, [ev])
    }
    return map
  }, [events])

  const parsed = fromISODate(value)
  const cursor = parsed ? new Date(parsed.getFullYear(), parsed.getMonth(), 1) : new Date()
  const todayISO = today ?? toISODate(new Date())
  const label = `${MONTHS[cursor.getMonth()] ?? ''} ${cursor.getFullYear()}`
  const cells = Array.from({ length: 42 }, (_, i) => addDays(cursor, i - ((cursor.getDay() + 6) % 7)))

  const selectIso = (iso: string): void => {
    setActiveIso(iso)
    onSelect?.(iso)
  }

  const handleKey = (e: ReactKeyboardEvent, index: number): void => {
    const target = cells[index]
    if (!target) return
    let iso: string | null = null
    if (e.key === 'ArrowLeft') iso = toISODate(addDays(target, -1))
    else if (e.key === 'ArrowRight') iso = toISODate(addDays(target, 1))
    else if (e.key === 'ArrowUp') iso = toISODate(addDays(target, -7))
    else if (e.key === 'ArrowDown') iso = toISODate(addDays(target, 7))
    else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      selectIso(toISODate(target))
      return
    } else return
    e.preventDefault()
    const next = fromISODate(iso)
    if (!next) return
    if (next.getMonth() !== cursor.getMonth()) onMonthChange?.(toISODate(new Date(next.getFullYear(), next.getMonth(), 1)))
    setActiveIso(iso)
    cellRefs.current[iso]?.focus()
    onSelect?.(iso)
  }

  return (
    <div style={S.wrap}>
      <div role="group" aria-label="Month navigation" style={S.head}>
        <button type="button" aria-label="Previous month" style={S.nav} onClick={() => onMonthChange?.(toISODate(addMonths(cursor, -1)))}>‹</button>
        <span style={S.title}>{label}</span>
        <button type="button" aria-label="Next month" style={S.nav} onClick={() => onMonthChange?.(toISODate(addMonths(cursor, 1)))}>›</button>
      </div>
      <div style={S.names}>
        {DAY_NAMES.map((name) => <span key={name} style={S.name}>{name}</span>)}
      </div>
      <div role="grid" aria-label={label}>
        {Array.from({ length: 6 }, (_, r) => {
          const rowCells = cells.slice(r * 7, r * 7 + 7)
          return (
            <div key={r} role="row">
              {rowCells.map((date, c) => {
                const iso = toISODate(date)
                const inMonth = date.getMonth() === cursor.getMonth()
                const dayEvents = eventMap.get(iso) ?? []
                const isToday = iso === todayISO
                return (
                  <div
                    key={iso}
                    ref={(el) => { cellRefs.current[iso] = el }}
                    role="cell"
                    tabIndex={inMonth && activeIso === iso ? 0 : -1}
                    aria-hidden={inMonth ? undefined : 'true'}
                    onClick={() => selectIso(iso)}
                    onKeyDown={(e) => handleKey(e, r * 7 + c)}
                    style={{ ...S.cell, ...(!inMonth ? S.other : {}), ...(isToday ? { border: 'calc(2px * var(--sf)) solid var(--accent)' } : {}), ...(activeIso === iso ? { background: 'var(--paper-deep)' } : {}) }}
                  >
                    <span>{date.getDate()}</span>
                    {dayEvents.map((ev, j) => <span key={j} style={S.event} aria-hidden="true">{ev.title}</span>)}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
