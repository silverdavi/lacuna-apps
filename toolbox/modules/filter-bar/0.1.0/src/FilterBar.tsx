// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/filter-bar 0.1.0: snapshot of lacuna-components FilterBar at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import type { CSSProperties } from 'react'
import { DatePicker } from '@lacuna/date-picker'

export interface FilterChipDef {
  /** Unique key for the chip. */
  key: string
  /** Visible label on the chip. */
  label: string
  /** Field name in the record to filter on. */
  field: string
  /** Value to match (string comparison). */
  value: string
}

export interface SortDef {
  /** Field name to sort by. */
  field: string
  /** Sort direction. */
  direction: 'asc' | 'desc'
  /** Visible text of the option. */
  label: string
}

export interface FilterBarProps {
  /** Available filter chips; clicking toggles them. */
  chips: FilterChipDef[]
  /** Currently active chip keys. */
  activeChips: string[]
  /** Called with the new set of active chip keys when a chip is toggled. */
  onChipsChange: (keys: string[]) => void
  /** Available sort options. */
  sortOptions: SortDef[]
  /** Currently selected sort. */
  sort: SortDef
  /** Called when the user changes the sort. */
  onSortChange: (sort: SortDef) => void
  /** Optional date-range filter; when provided, a DatePicker is rendered. */
  dateRange?: { start: string; end: string }
  /** Called when the date range changes. */
  onDateRangeChange?: (range: { start: string; end: string }) => void
  /** Called with the full filter/sort spec for the parent to apply to its data. */
  onFilterChange?: (spec: {
    chips: FilterChipDef[]
    sort: SortDef
    dateRange?: { start: string; end: string }
  }) => void
}

const S = {
  toolbar: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'calc(8px * var(--sf))',
    padding: 'calc(8px * var(--sf))',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    borderRadius: 'calc(4px * var(--sf))',
    background: 'var(--paper-deep)',
  },
  chip: (active: boolean): CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
    border: `calc(1px * var(--sf)) solid ${active ? 'var(--ink)' : 'var(--hair-strong)'}`,
    borderRadius: 'calc(999px * var(--sf))',
    background: active ? 'var(--ink)' : 'var(--paper)',
    color: active ? 'var(--paper)' : 'var(--ink)',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    lineHeight: 1,
    cursor: 'pointer',
  }),
  group: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'calc(4px * var(--sf))',
  },
  select: {
    border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
    borderRadius: 'calc(4px * var(--sf))',
    background: 'var(--paper)',
    color: 'var(--ink)',
    fontFamily: 'var(--sans)',
    fontSize: 'calc(14px * var(--tf))',
    padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
    cursor: 'pointer',
  },
  label: {
    fontFamily: 'var(--mono)',
    fontSize: 'calc(11px * var(--tf))',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--ink)',
  },
} as const

export function FilterBar({
  chips,
  activeChips,
  onChipsChange,
  sortOptions,
  sort,
  onSortChange,
  dateRange,
  onDateRangeChange,
  onFilterChange,
}: FilterBarProps) {
  const activeChipsSet = new Set(activeChips)

  const emitFilter = (nextActive: string[], nextSort: SortDef, nextRange?: { start: string; end: string }): void => {
    onFilterChange?.({
      chips: chips.filter((c) => nextActive.includes(c.key)),
      sort: nextSort,
      ...(nextRange !== undefined ? { dateRange: nextRange } : {}),
    })
  }

  const toggleChip = (chip: FilterChipDef): void => {
    const nextActive = activeChipsSet.has(chip.key)
      ? activeChips.filter((k) => k !== chip.key)
      : [...activeChips, chip.key]
    onChipsChange(nextActive)
    emitFilter(nextActive, sort, dateRange)
  }

  const changeSort = (value: string): void => {
    const next = sortOptions.find((o) => o.label === value)
    if (next === undefined) return
    onSortChange(next)
    emitFilter([...activeChips], next, dateRange)
  }

  const changeRange = (value: string | [string, string] | null): void => {
    if (value === null || typeof value === 'string') return
    const [start, end] = value
    const nextRange = { start, end }
    onDateRangeChange?.(nextRange)
    emitFilter([...activeChips], sort, nextRange)
  }

  const rangeValue: [string, string] | null =
    dateRange !== undefined ? [dateRange.start, dateRange.end] : null

  const sortValue = sort.label

  return (
    <div role="toolbar" aria-label="Filters" style={S.toolbar}>
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-pressed={activeChipsSet.has(chip.key)}
          onClick={() => toggleChip(chip)}
          style={S.chip(activeChipsSet.has(chip.key))}
        >
          {chip.label}
        </button>
      ))}

      <div style={S.group}>
        <span style={S.label}>Sort</span>
        <select
          aria-label="Sort"
          value={sortValue}
          onChange={(e) => changeSort(e.target.value)}
          style={S.select}
        >
          {sortOptions.map((o) => (
            <option key={o.label} value={o.label}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {dateRange !== undefined && (
        <div role="group" aria-label="Date range" style={S.group}>
          <DatePicker
            value={rangeValue}
            onChange={changeRange}
            mode="range"
            ariaLabel="Date range"
            showClear={false}
          />
        </div>
      )}
    </div>
  )
}
