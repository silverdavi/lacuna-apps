// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/heatmap 0.1.0: snapshot of lacuna-components Heatmap at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { addDays, toISODate } from '@lacuna/date-math';

export interface HeatmapCell {
  date: string;
  value: number;
}

export interface HeatmapProps {
  data: HeatmapCell[];
  year?: number;
  max?: number;
  label?: string;
  onCellClick?: (date: string, value: number) => void;
  style?: CSSProperties;
}

const WEEKS = 53;
const DAYS = 7;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WRAP: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(8px * var(--sf))',
};

const HEADING: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
};

const GRID: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
  gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))`,
  gap: 'calc(2px * var(--sf))',
  fontFamily: 'var(--sans)',
  padding: 'calc(8px * var(--sf))',
  background: 'var(--paper-deep)',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(8px * var(--sf))',
  outline: 'none',
};

const BASE_CELL: CSSProperties = {
  width: 'calc(12px * var(--sf))',
  height: 'calc(12px * var(--sf))',
  borderRadius: 'calc(2px * var(--sf))',
  background: 'var(--accent)',
  boxSizing: 'border-box',
  outline: 'none',
  userSelect: 'none',
  margin: 0,
};

function level(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(4, Math.round((value / max) * 4));
}

function labelFor(date: Date, value: number): string {
  const month = MONTHS[date.getMonth()] ?? '';
  return `${month} ${date.getDate()}, ${date.getFullYear()}: ${value}`;
}

export function Heatmap(props: HeatmapProps) {
  const { data, year, max, label, onCellClick, style } = props;

  const yearValue = year ?? new Date().getFullYear();
  const start = new Date(yearValue, 0, 1);

  const valueByISO = new Map<string, number>();
  for (const cell of data) {
    valueByISO.set(cell.date, cell.value);
  }
  const dataMax = data.reduce((acc, cell) => Math.max(acc, cell.value), 0);
  const effectiveMax = max ?? dataMax;

  // Build a map: ISO date -> { week, day, value }
  // week = column index (0-52), day = row index (0-6, Sunday=0)
  const cellByISO = new Map<string, { week: number; day: number; value: number; date: Date }>();
  const dayOfYear = start.getDay(); // 0=Sun, 1=Mon, ...
  for (let week = 0; week < WEEKS; week++) {
    for (let day = 0; day < DAYS; day++) {
      const dayIndex = week * DAYS + day - dayOfYear;
      if (dayIndex < 0) continue;
      const date = addDays(start, dayIndex);
      if (date.getFullYear() !== yearValue) continue;
      const iso = toISODate(date);
      const value = valueByISO.get(iso);
      if (value === undefined) continue;
      cellByISO.set(iso, { week, day, value, date });
    }
  }

  // Build a list of dates in order for keyboard navigation
  const orderedDates: Array<{ iso: string; week: number; day: number; value: number; date: Date }> = [];
  for (let dayIndex = 0; dayIndex < 366; dayIndex++) {
    const date = addDays(start, dayIndex);
    if (date.getFullYear() !== yearValue) break;
    const iso = toISODate(date);
    const cell = cellByISO.get(iso);
    if (cell) {
      orderedDates.push({ iso, week: cell.week, day: cell.day, value: cell.value, date });
    }
  }

  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  const getCellIndex = (week: number, day: number) => day * WEEKS + week;

  const moveFocusToDate = (iso: string) => {
    const cell = cellByISO.get(iso);
    if (!cell) return;
    const index = getCellIndex(cell.week, cell.day);
    setFocusIndex(index);
    cellRefs.current[index]?.focus();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    if (focusIndex === null) {
      if (key === 'ArrowRight' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowUp') {
        event.preventDefault();
        const first = orderedDates[0];
        if (first) moveFocusToDate(first.iso);
        return;
      }
      return;
    }

    // Find the current date from the focused cell
    const currentCell = orderedDates.find(
      (c) => getCellIndex(c.week, c.day) === focusIndex,
    );
    if (!currentCell) return;

    const currentIdx = orderedDates.indexOf(currentCell);

    switch (key) {
      case 'ArrowRight': {
        event.preventDefault();
        const next = orderedDates[currentIdx + 1];
        if (next) moveFocusToDate(next.iso);
        break;
      }
      case 'ArrowLeft': {
        event.preventDefault();
        const prev = orderedDates[currentIdx - 1];
        if (prev) moveFocusToDate(prev.iso);
        break;
      }
      case 'ArrowDown':
        event.preventDefault();
        const downIso = toISODate(addDays(currentCell.date, 7));
        moveFocusToDate(downIso);
        break;
      case 'ArrowUp':
        event.preventDefault();
        const upIso = toISODate(addDays(currentCell.date, -7));
        moveFocusToDate(upIso);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        onCellClick?.(currentCell.iso, currentCell.value);
        break;
      default:
        break;
    }
  };

  // Render 7 rows (days of week) x 53 columns (weeks)
  return (
    <div style={{ ...WRAP, ...style }}>
      {label ? (
        <h2 style={HEADING} aria-level={2}>
          {label}
        </h2>
      ) : null}
      <div
        role="grid"
        aria-label={`${yearValue} activity heatmap`}
        aria-rowcount={DAYS}
        aria-colcount={WEEKS}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={GRID}
      >
        {Array.from({ length: DAYS }, (_, day) => (
          <div key={`day-${day}`} role="row" style={{ display: 'contents' }}>
            {Array.from({ length: WEEKS }, (_, week) => {
              const index = day * WEEKS + week;
              const dayIndex = week * DAYS + day - start.getDay();
              const date = dayIndex >= 0 ? addDays(start, dayIndex) : null;
              const inYear = date !== null && date.getFullYear() === yearValue;
              const iso = inYear ? toISODate(date!) : undefined;
              const value = iso ? valueByISO.get(iso) : undefined;
              const hasData = value !== undefined;
              const ariaLabel = hasData ? labelFor(date!, value!) : 'No data';
              const cellLevel = hasData ? level(value!, effectiveMax) : 0;
              return (
                <div
                  key={`cell-${index}`}
                  role="gridcell"
                  aria-label={ariaLabel}
                  aria-rowindex={day + 1}
                  aria-colindex={week + 1}
                  ref={(el) => {
                    cellRefs.current[index] = el;
                  }}
                  tabIndex={
                    hasData && iso === toISODate(start) ? 0 : -1
                  }
                  className={`heatmap-cell opacity-${cellLevel}`}
                  data-date={iso}
                  data-value={value ?? 0}
                  onClick={() => {
                    if (hasData) {
                      onCellClick?.(iso!, value!);
                    }
                  }}
                  onFocus={() => setFocusIndex(index)}
                  style={{
                    ...BASE_CELL,
                    opacity: hasData ? 0.15 + cellLevel * 0.2 : 0.1,
                    ...(focusIndex === index
                      ? {
                          outline: 'calc(2px * var(--sf)) solid var(--accent)',
                          outlineOffset: 'calc(-calc(2px * var(--sf)))',
                        }
                      : null),
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
