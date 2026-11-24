// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/tracker-kit 0.1.0: snapshot of lacuna-components TrackerKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent, ReactElement } from 'react'
import { useCollection } from '@lacuna/use-collection'
import { useStreak } from '@lacuna/use-streak'
import { Heatmap } from '@lacuna/heatmap'
import type { HeatmapCell } from '@lacuna/heatmap'
import { Chart } from '@lacuna/chart'
import { DatePicker } from '@lacuna/date-picker'
import { addDays, toISODate, fromISODate, startOfDay } from '@lacuna/date-math'
import type { TrackerEntry, TrackerKitProps } from './index'

const CHART_DAYS = 30

const wrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(16px * var(--sf))',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
}

const headingStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(20px * var(--tf))',
  fontWeight: 700,
  color: 'var(--ink)',
  margin: 0,
}

const formRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'calc(12px * var(--sf))',
}

const inputStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(12px * var(--sf))',
  minWidth: 'calc(96px * var(--sf))',
}

const unitLabelStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
}

const sectionTitleStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  fontWeight: 600,
  color: 'var(--ink)',
  margin: '0 0 calc(8px * var(--sf))',
}

const streakStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  margin: 0,
}

const primaryButtonStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--paper)',
  background: 'var(--ink)',
  border: 'none',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(8px * var(--sf)) calc(16px * var(--sf))',
  cursor: 'pointer',
}

const ghostButtonStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
  background: 'transparent',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  cursor: 'pointer',
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(4px * var(--sf))',
  margin: 0,
  padding: 0,
  listStyle: 'none',
}

const listItemStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 'calc(8px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  padding: 'calc(6px * var(--sf)) calc(8px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(4px * var(--sf))',
}

const detailStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(12px * var(--sf))',
  background: 'var(--paper-deep)',
}

const monoValueStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
}

const emptyStyle: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(13px * var(--tf))',
  color: 'var(--ink)',
  margin: 0,
}

function plural(n: number): string {
  return n === 1 ? 'day' : 'days'
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

function addIsoDays(iso: string, days: number): string {
  const d = fromISODate(iso)
  if (d === null) return iso
  return toISODate(addDays(d, days))
}

function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

function firstDisplayedEntry(items: Array<{ data: TrackerEntry }>): string | null {
  let oldest: string | null = null
  for (const item of items) {
    if (oldest === null || item.data.date < oldest) oldest = item.data.date
  }
  return oldest
}

export function TrackerKitImpl(props: TrackerKitProps): ReactElement {
  const { title, min = 0, max = 100, unit = '', initialEntries, style, storageKey } = props

  const [value, setValue] = useState<string>('')
  const [date, setDate] = useState<string>(() => toISODate(new Date()))
  const [pickerOpen, setPickerOpen] = useState<boolean>(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)

  const stopKey = useCallback((event: KeyboardEvent<HTMLDivElement>) => { event.stopPropagation() }, [])

  const seed = useMemo(
    () =>
      (initialEntries ?? []).map((entry) => ({
        data: { date: entry.date, value: entry.value, note: entry.note },
        archived: false,
      })),
    [initialEntries],
  )
  const { state, actions } = useCollection<TrackerEntry>({
    storageKey,
    initialItems: seed,
  })
  const items = state.items

  const { checkIns, streak, checkIn, removeCheckIn } = useStreak({
    recordKey: `tracker-${storageKey}`,
  })

  useEffect(() => {
    const datesInEntries = new Set<string>()
    for (const item of items) datesInEntries.add(item.data.date)
    for (const checkInDate of checkIns) {
      if (!datesInEntries.has(checkInDate)) removeCheckIn(checkInDate)
    }
    for (const iso of datesInEntries) {
      checkIn(iso)
    }
  }, [items, checkIns, checkIn, removeCheckIn])

  useEffect(() => {
    if (selectedDate === null) setSelectedDate(firstDisplayedEntry(items))
  }, [selectedDate, items])

  const itemsByDate = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const item of items) {
      const list = map.get(item.data.date)
      if (list === undefined) map.set(item.data.date, [item.id])
      else list.push(item.id)
    }
    return map
  }, [items])

  const heatmapCells = useMemo<HeatmapCell[]>(() => {
    const sumByDate = new Map<string, number>()
    for (const item of items) {
      sumByDate.set(item.data.date, (sumByDate.get(item.data.date) ?? 0) + item.data.value)
    }
    const cells: HeatmapCell[] = []
    for (const [iso, sum] of sumByDate) cells.push({ date: iso, value: sum })
    return cells
  }, [items])

  const chartData = useMemo(() => {
    const sumByMonth = new Map<string, number>()
    for (const item of items) {
      const key = monthKey(item.data.date)
      sumByMonth.set(key, (sumByMonth.get(key) ?? 0) + item.data.value)
    }
    const today = startOfDay(new Date())
    const data: Array<{ label: string; value: number }> = []
    for (let i = CHART_DAYS - 1; i >= 0; i--) {
      const iso = toISODate(addDays(today, -i))
      const key = monthKey(iso)
      data.push({ label: key, value: sumByMonth.get(key) ?? 0 })
    }
    return data
  }, [items])

  const sortedItems = useMemo(
    () =>
      [...items].sort(
        (a, b) => b.data.date.localeCompare(a.data.date) || b.id.localeCompare(a.id),
      ),
    [items],
  )

  const selectedItems = useMemo(() => {
    if (selectedDate === null) return []
    if (selectedEntryId !== null) {
      const byId = items.find((item) => item.id === selectedEntryId)
      return byId !== undefined && byId.data.date === selectedDate ? [byId] : []
    }
    return (itemsByDate.get(selectedDate) ?? []).map((id) => items.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => item !== undefined)
  }, [selectedDate, selectedEntryId, itemsByDate, items])

  function handleDateInputClick(event: MouseEvent<HTMLInputElement>): void {
    event.preventDefault()
    setPickerOpen(true)
    dateInputRef.current?.focus()
  }

  function handleWrapperKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (pickerOpen && event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setPickerOpen(false)
      dateInputRef.current?.focus()
    }
  }

  function handleDateInputKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'Tab' && !event.shiftKey && !pickerOpen) {
      event.preventDefault()
      addButtonRef.current?.focus()
    }
  }

  function parseValue(raw: string): number | null {
    const trimmed = raw.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    if (Number.isNaN(n) || n < min || n > max) return null
    return n
  }

  function handleAdd(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const parsed = parseValue(value)
    if (parsed === null) return
    if (fromISODate(date) === null) return
    actions.add({ date, value: parsed, note: undefined })
    setValue('')
  }

  function handleSelectDate(next: string | [string, string] | null): void {
    if (typeof next === 'string') { setDate(next); setPickerOpen(false) }
  }

  function handleRemoveSelected(): void {
    if (selectedDate === null) return
    const sameDate = items.filter((item) => item.data.date === selectedDate)
    if (sameDate.length === 0) return
    const nextSelectedId = sameDate.length > 1 ? sameDate[1]?.id ?? null : null
    for (const item of sameDate) actions.remove(item.id)
    setSelectedEntryId(nextSelectedId)
    if (nextSelectedId === null) setSelectedDate(addIsoDays(selectedDate, -1))
  }

  function handleClearAll(): void { setSelectedEntryId(null); setSelectedDate(null); for (const item of items) actions.remove(item.id) }

  return (
    <div style={{ ...wrapStyle, ...style }} onKeyDown={handleWrapperKeyDown}>
      <h1 style={headingStyle} tabIndex={0}>{title}</h1>

      <form style={formRowStyle} onSubmit={handleAdd}>
        <input
          type="number"
          aria-label="Value"
          value={value}
          min={min}
          max={max}
          step={1}
          placeholder="0"
          onChange={(event) => setValue(event.target.value)}
          style={inputStyle}
        />
        {unit !== '' && <span style={unitLabelStyle}>{unit}</span>}
        <input
          ref={dateInputRef}
          type="date"
          aria-label="Date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          onClick={handleDateInputClick}
          onKeyDown={handleDateInputKeyDown}
          style={inputStyle}
        />
        <button ref={addButtonRef} type="submit" style={primaryButtonStyle}>
          Add
        </button>
      </form>

      {pickerOpen && (
        <div onKeyDown={stopKey} onKeyUp={stopKey}>
          <DatePicker
            value={date === '' ? null : date}
            onChange={handleSelectDate}
            ariaLabel="Choose date"
            showClear={false}
          />
        </div>
      )}

      <p style={streakStyle} aria-live="polite">
        Current streak: {streak.current} {plural(streak.current)}
        {' · '}
        Longest: {streak.longest} {plural(streak.longest)}
      </p>

      <div>
        <h2 style={sectionTitleStyle}>Activity</h2>
        <Heatmap data={heatmapCells} onCellClick={(d) => setSelectedDate(d)} />
      </div>

      <div>
        <h2 style={sectionTitleStyle}>Trend</h2>
        <Chart data={chartData} type="line" ariaLabel="Trend chart" />
      </div>

      <div>
        <h2 style={sectionTitleStyle}>Entries</h2>
        {sortedItems.length === 0 ? (
          <p style={emptyStyle}>No entries yet.</p>
        ) : (
          <ul style={listStyle}>
            {sortedItems.map((item) => (
              <li key={item.id} style={listItemStyle}>
                <span>{item.data.date}</span>
                <span style={monoValueStyle}>
                  {item.data.value}
                  {unit !== '' ? ` ${unit}` : ''}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedItems[0] !== undefined &&
        (() => {
          const first = selectedItems[0]
          return (
            <div style={detailStyle} role="region" aria-label="Entry detail">
              <strong>{first.data.date}</strong>
              <span style={monoValueStyle}>
                {formatNumber(first.data.value)}
                {unit !== '' ? ` ${unit}` : ''}
              </span>
              {first.data.note !== undefined && (
                <span style={monoValueStyle}>{first.data.note}</span>
              )}
              <div>
                <button type="button" style={primaryButtonStyle} onClick={handleRemoveSelected}>
                  Remove
                </button>
              </div>
            </div>
          )
        })()}

      {sortedItems.length > 0 && (
        <div>
          <button type="button" style={ghostButtonStyle} onClick={handleClearAll}>
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}
