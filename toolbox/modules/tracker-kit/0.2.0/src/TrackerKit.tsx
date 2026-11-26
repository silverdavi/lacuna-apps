// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/tracker-kit 0.2.0: snapshot of lacuna-components TrackerKit at ecef1e3 by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, KeyboardEvent, MouseEvent } from 'react'
import { useCollection } from '@lacuna/use-collection'
import { useStreak } from '@lacuna/use-streak'
import { Heatmap } from '@lacuna/heatmap'
import type { HeatmapCell } from '@lacuna/heatmap'
import { Chart } from '@lacuna/chart'
import { DatePicker } from '@lacuna/date-picker'
import { addDays, toISODate, fromISODate, startOfDay } from '@lacuna/date-math'
import { Button, Card, EmptyState, Kpi, KpiRow, List, Row, SectionLabel } from '@lacuna/ui'
import type { TrackerEntry, TrackerKitProps } from './index'

const CHART_DAYS = 30

const entryFormStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(150px * var(--sf)), 1fr))',
  alignItems: 'end',
  gap: 'calc(12px * var(--sf))',
}

const headingStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--serif)',
  fontWeight: 500,
  fontSize: 'calc(22px * var(--tf))',
  color: 'var(--ink)',
}

const unitStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(9px * var(--tf))',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--ink-60)',
}

const detailStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(6px * var(--sf))',
  marginTop: 'calc(12px * var(--sf))',
  padding: 'calc(12px * var(--sf))',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(2px * var(--sf))',
}

const detailValueStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink)',
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

export function TrackerKitImpl(props: TrackerKitProps) {
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
    () => [...items].sort((a, b) => b.data.date.localeCompare(a.data.date) || b.id.localeCompare(a.id)),
    [items],
  )

  const selectedItems = useMemo(() => {
    if (selectedDate === null) return []
    if (selectedEntryId !== null) {
      const byId = items.find((item) => item.id === selectedEntryId)
      return byId !== undefined && byId.data.date === selectedDate ? [byId] : []
    }
    return (itemsByDate.get(selectedDate) ?? [])
      .map((id) => items.find((item) => item.id === id))
      .filter((item): item is NonNullable<typeof item> => item !== undefined)
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
    if (typeof next === 'string') {
      setDate(next)
      setPickerOpen(false)
    }
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

  function handleClearAll(): void {
    setSelectedEntryId(null)
    setSelectedDate(null)
    for (const item of items) actions.remove(item.id)
  }

  const firstSelected = selectedItems[0]
  const hasEntries = sortedItems.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(14px * var(--sf))', ...style }} onKeyDown={handleWrapperKeyDown}>
      <h1 style={headingStyle}>{title}</h1>
      <Card mono="Entry" title="New entry">
        <form style={entryFormStyle} onSubmit={handleAdd}>
          <div>
            <input
              type="number"
              aria-label="Value"
              className="lc-input"
              value={value}
              min={min}
              max={max}
              step={1}
              placeholder="0"
              onChange={(event) => setValue(event.target.value)}
            />
          </div>
          <div>
            <div style={unitStyle}>{unit === '' ? 'Date' : unit}</div>
            <input
              ref={dateInputRef}
              type="date"
              aria-label="Date"
              className="lc-input"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              onClick={handleDateInputClick}
              onKeyDown={handleDateInputKeyDown}
            />
          </div>
          <button
            ref={addButtonRef}
            type="submit"
            className="lc-btn secondary"
          >
            Add
          </button>
        </form>
        {pickerOpen && (
          <div onKeyDown={stopKey} onKeyUp={stopKey}>
            <DatePicker value={date === '' ? null : date} onChange={handleSelectDate} ariaLabel="Choose date" showClear={false} />
          </div>
        )}
      </Card>

      <Card mono="Streak" title="Momentum">
        <KpiRow>
          <Kpi value={`${streak.current} ${plural(streak.current)}`} label="Current" accent />
          <Kpi value={`${streak.longest} ${plural(streak.longest)}`} label="Longest" />
        </KpiRow>
        <p style={{ margin: 'calc(10px * var(--sf)) 0 0', fontFamily: 'var(--sans)', fontSize: 'calc(13.5px * var(--tf))', color: 'var(--ink)' }} aria-live="polite">
          Current streak: {streak.current} {plural(streak.current)}
          {' · '}
          Longest: {streak.longest} {plural(streak.longest)}
        </p>
      </Card>

      <Card mono="Activity" title="Last year">
        <SectionLabel>Activity</SectionLabel>
        <Heatmap data={heatmapCells} onCellClick={(d) => setSelectedDate(d)} />
      </Card>

      <Card mono="Trend" title="30 days">
        <Chart data={chartData} type="line" ariaLabel="Trend chart" />
      </Card>

      <Card mono="Log" title={hasEntries ? `${sortedItems.length} ${sortedItems.length === 1 ? 'entry' : 'entries'}` : 'Entries'} actions={hasEntries ? <Button kind="ghost" onClick={handleClearAll}>Clear all</Button> : undefined}>
        {hasEntries ? (
          <List label="Entries">
            {sortedItems.map((item) => (
              <Row key={item.id} title={item.data.date} value={formatNumber(item.data.value) + (unit !== '' ? ` ${unit}` : '')} />
            ))}
          </List>
        ) : (
          <EmptyState mono="Empty" title="No entries yet" detail="Add your first entry above." />
        )}
        {firstSelected !== undefined && (
          <div style={detailStyle} role="region" aria-label="Entry detail">
            <strong>{firstSelected.data.date}</strong>
            <span style={detailValueStyle}>
              {formatNumber(firstSelected.data.value)}
              {unit !== '' ? ` ${unit}` : ''}
            </span>
            {firstSelected.data.note !== undefined && <span style={detailValueStyle}>{firstSelected.data.note}</span>}
            <Button kind="secondary" onClick={handleRemoveSelected} style={{ alignSelf: 'flex-start' }}>Remove</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
