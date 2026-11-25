// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/date-picker 0.1.0: snapshot of lacuna-components DatePicker at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react'
import { addDays, fromISODate, toISODate } from '@lacuna/date-math'

export interface DatePickerProps {
  value: string | [string, string] | null
  onChange: (value: string | [string, string] | null) => void
  mode?: 'single' | 'range'
  min?: string
  max?: string
  disabled?: boolean
  ariaLabel?: string
  showClear?: boolean
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const

const S = {
  root: {
    display: 'inline-flex', flexDirection: 'column',
    gap: 'calc(8px * var(--sf))', padding: 'calc(12px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(4px * var(--sf))', background: 'var(--paper)',
    color: 'var(--ink)', fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))', minWidth: 'calc(280px * var(--sf))',
  },
  header: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: 'calc(8px * var(--sf))',
  },
  navBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 'calc(28px * var(--sf))', height: 'calc(28px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(4px * var(--sf))', background: 'transparent',
    color: 'var(--ink)', fontFamily: 'var(--sans)',
    fontSize: 'calc(16px * var(--tf))', cursor: 'pointer',
    padding: 0, lineHeight: 1,
  },
  title: {
    fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))',
    fontWeight: 600, color: 'var(--ink)', textAlign: 'center',
  },
  weekdayCell: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 'calc(28px * var(--sf))', fontFamily: 'var(--mono)',
    fontSize: 'calc(11px * var(--tf))', color: 'var(--ink)',
    textAlign: 'center', letterSpacing: '0.05em', textTransform: 'uppercase',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    background: 'var(--paper-deep)',
  },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0,
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    borderRadius: 'calc(4px * var(--sf))', overflow: 'hidden',
  },
  clear: {
    alignSelf: 'flex-start', marginTop: 'calc(4px * var(--sf))',
    background: 'transparent', border: 'none', color: 'var(--ink)',
    fontFamily: 'var(--sans)', fontSize: 'calc(12px * var(--tf))',
    cursor: 'pointer', padding: 'calc(2px * var(--sf)) 0',
    textDecoration: 'underline',
  },
} as const

function cellStyle(
  selected: boolean, inRange: boolean, dis: boolean, isPending: boolean,
): CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 'calc(32px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    background: selected ? 'var(--ink)' : inRange ? 'var(--paper-deep)' : 'transparent',
    color: selected ? 'var(--paper)' : 'var(--ink)',
    cursor: dis ? 'default' : 'pointer',
    opacity: dis ? 0.4 : 1,
    outline: isPending ? 'calc(2px * var(--sf)) solid var(--accent)' : 'none',
    outlineOffset: '-calc(2px * var(--sf))',
    fontSize: 'calc(13px * var(--tf))',
    userSelect: 'none',
  }
}

function dayDisabled(iso: string, min: string | undefined, max: string | undefined): boolean {
  if (min && iso < min) return true
  if (max && iso > max) return true
  return false
}

function selEnds(
  value: string | [string, string] | null,
  pending: string | null,
): [string, string] | null {
  if (pending !== null) {
    if (value !== null && Array.isArray(value)) {
      return pending >= value[0] ? [value[0], pending] : [pending, value[0]]
    }
    return [pending, pending]
  }
  if (value !== null && Array.isArray(value)) return [value[0], value[1]]
  return null
}

interface CellInfo {
  iso: string | null
  day: number
  dis: boolean
  sel: boolean
  inRange: boolean
  pending: boolean
}

export function DatePicker({
  value, onChange, mode = 'single', min, max, disabled = false,
  ariaLabel = 'Date picker', showClear = true,
}: DatePickerProps) {
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value !== null) {
      const first = Array.isArray(value) ? value[0] : value
      const parsed = fromISODate(first)
      if (parsed) return parsed
    }
    return new Date()
  })
  const [pending, setPending] = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthName = MONTHS[month] ?? ''
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = useMemo<CellInfo[]>(() => {
    const list: CellInfo[] = []
    const firstOfMonth = new Date(year, month, 1)
    const startOffset = firstOfMonth.getDay()
    for (let i = 0; i < startOffset; i++) list.push({ iso: null, day: i + 1, dis: false, sel: false, inRange: false, pending: false })
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = toISODate(new Date(year, month, d))
      list.push({
        iso,
        day: d,
        dis: disabled || dayDisabled(iso, min, max),
        sel:
          value !== null &&
          ((mode === 'single' ? value === iso : (Array.isArray(value) && (value[0] === iso || value[1] === iso)) || pending === iso)),
        inRange:
          mode === 'range'
            ? (() => {
                const e = selEnds(value, pending)
                return e !== null && e[0] <= iso && iso <= e[1]
              })()
            : false,
        pending: pending === iso,
      })
    }
    let tailOffset = daysInMonth + 1
    while (list.length % 7 !== 0) {
      list.push({ iso: null, day: tailOffset++, dis: false, sel: false, inRange: false, pending: false })
    }
    return list
  }, [year, month, daysInMonth, disabled, min, max, value, pending, mode])



  const handleSelect = (iso: string): void => {
    if (disabled || dayDisabled(iso, min, max)) return
    if (mode === 'single') {
      onChange(iso)
      setPending(null)
      return
    }
    if (pending === null) {
      setPending(iso)
      onChange([iso, iso])
    } else if (pending <= iso) {
      onChange([pending, iso])
      setPending(null)
    } else {
      setPending(iso)
      onChange([iso, iso])
    }
  }

  const focusCellAtFlatIndex = (idx: number): void => {
    const root = gridRef.current
    if (!root) return
    const allCells = root.querySelectorAll<HTMLElement>('[role="gridcell"]')
    const el = allCells[idx]
    el?.focus()
  }

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>): void => {
    if (disabled) return
    const target = event.target as HTMLElement
    const idxAttr = target.dataset.idx
    if (idxAttr === undefined) return
    const flatIndex = Number(idxAttr)
    const cell = cells[flatIndex]
    if (cell === undefined) return
    const total = cells.length

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        if (flatIndex + 1 < total) focusCellAtFlatIndex(flatIndex + 1)
        return
      case 'ArrowLeft':
        event.preventDefault()
        if (flatIndex - 1 >= 0) focusCellAtFlatIndex(flatIndex - 1)
        return
      case 'ArrowDown':
        event.preventDefault()
        if (flatIndex + 7 < total) focusCellAtFlatIndex(flatIndex + 7)
        return
      case 'ArrowUp':
        event.preventDefault()
        if (flatIndex - 7 >= 0) focusCellAtFlatIndex(flatIndex - 7)
        return
      case 'Enter':
        event.preventDefault()
        if (cell.iso !== null) handleSelect(cell.iso)
        return
      case 'Escape':
        event.preventDefault()
        setPending(null)
        return
      default:
        return
    }
  }

  const rangeLabel = useMemo((): string | null => {
    if (mode !== 'range' || pending === null) return null
    const ends = selEnds(value, pending)
    return ends === null ? null : `${ends[0]} to ${ends[1]}`
  }, [mode, pending, value])

  const rows: CellInfo[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
  }

  return (
    <div
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      style={S.root}
    >
      <div style={S.header}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={S.navBtn}
        >
          Previous
        </button>
        <div style={S.title}>{monthName} {year}</div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={S.navBtn}
        >
          Next
        </button>
      </div>

      <div
        ref={gridRef}
        role="grid"
        aria-label={`${monthName} ${year}`}
        style={S.grid}
        onKeyDown={handleKeyDown}
      >
        <div role="row">
          {WEEKDAYS.map((d) => (
            <div key={d} role="columnheader" style={S.weekdayCell}>
              {d}
            </div>
          ))}
        </div>
        {rows.map((row, ri) => (
          <div key={ri} role="row">
            {row.map((c, ci) => {
              const flatIdx = ri * 7 + ci
              const iso = c.iso
              if (iso === null) {
                return (
                  <div
                    key={`pad-${flatIdx}`}
                    role="gridcell"
                    aria-disabled="true"
                    tabIndex={0}
                    data-idx={flatIdx}
                    style={cellStyle(false, false, true, false)}
                  >
                    {'\u00a0'}
                  </div>
                )
              }
              return (
                <div
                  key={iso}
                  role="gridcell"
                  aria-selected={c.sel}
                  aria-disabled={c.dis || undefined}
                  aria-label={`${monthName} ${c.day}, ${year}`}
                  data-idx={flatIdx}
                  tabIndex={c.dis ? -1 : 0}
                  onClick={() => handleSelect(iso)}
                  style={cellStyle(c.sel, c.inRange && !c.sel, c.dis, c.pending)}
                >
                  {c.day}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {rangeLabel !== null && (
        <div
          style={{
            fontFamily: 'var(--sans)',
            fontSize: 'calc(12px * var(--tf))',
            color: 'var(--ink)',
          }}
        >
          {rangeLabel}
        </div>
      )}

      {showClear && value !== null && !disabled && (
        <button
          type="button"
          onClick={() => {
            onChange(null)
            setPending(null)
          }}
          style={S.clear}
        >
          Clear
        </button>
      )}
    </div>
  )
}
