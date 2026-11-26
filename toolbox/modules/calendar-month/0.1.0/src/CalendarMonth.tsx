// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/calendar-month 0.1.0: snapshot of lacuna-components CalendarMonth at f879fb0 by sync-toolbox-components.py; a change gets a new version.
import { useRef, useState, useMemo, useCallback } from 'react';
import type { ReactElement, CSSProperties, KeyboardEvent } from 'react';
import {
  fromISODate,
  toISODate,
  startOfMonth,
  startOfDay,
  addDays,
  addMonths,
} from '@lacuna/date-math';

export interface CalendarEvent {
  date: string;
  title: string;
  className?: string;
}

export interface CalendarMonthProps {
  value: string;
  events?: CalendarEvent[];
  onSelect?: (date: string) => void;
  onMonthChange?: (date: string) => void;
  today?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function monthLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month]} ${year}`;
}

function cellLabel(year: number, month: number, day: number, events: CalendarEvent[]): string {
  const datePart = `${MONTH_NAMES[month]} ${day}, ${year}`;
  if (events.length === 0) return datePart;
  const titles = events.map((ev) => ev.title).join(', ');
  return `${day} ${titles}, ${datePart}`;
}

interface DayCell {
  iso: string;
  label: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

function buildGrid(value: string, events: CalendarEvent[] | undefined, todayProp: string | undefined): DayCell[] {
  const parsed = fromISODate(value);
  if (!parsed) return [];
  const year = parsed.getFullYear();
  const month = parsed.getMonth();
  const monthStart = startOfMonth(parsed);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const gridStart = startOfDay(addDays(monthStart, -lead));
  const inMonthEnd = lead + daysInMonth;
  const gridSize = inMonthEnd + (7 - inMonthEnd % 7) % 7;

  const eventMap = new Map<string, CalendarEvent[]>();
  if (events) {
    for (const ev of events) {
      const existing = eventMap.get(ev.date);
      if (existing) existing.push(ev);
      else eventMap.set(ev.date, [ev]);
    }
  }

  const todayISO = todayProp ?? toISODate(new Date());

  const cells: DayCell[] = [];
  for (let idx = 0; idx < gridSize; idx++) {
    const date = addDays(gridStart, idx);
    const y = date.getFullYear();
    const m = date.getMonth();
    const day = date.getDate();
    const iso = toISODate(date);
    const inMonth = y === year && m === month;
    const cellEvents = eventMap.get(iso) ?? [];
    cells.push({
      iso,
      label: cellLabel(y, m, day, cellEvents),
      day,
      inMonth,
      isToday: iso === todayISO,
      events: cellEvents,
    });
  }
  return cells;
}

const btnStyle: CSSProperties = {
  padding: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(4px * var(--sf))',
  background: 'var(--paper)',
  color: 'var(--ink)',
  cursor: 'pointer',
  fontSize: 'calc(12px * var(--tf))',
  fontFamily: 'var(--sans)',
};

function dayCellStyle(cell: DayCell, isSelected: boolean): CSSProperties {
  const base: CSSProperties = {
    position: 'relative',
    minHeight: 'calc(64px * var(--sf))',
    padding: 'calc(4px * var(--sf))',
    cursor: 'pointer',
    userSelect: 'none',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    background: 'var(--paper)',
    color: 'var(--ink)',
    outline: 'none',
    fontSize: 'calc(12px * var(--tf))',
  };
  if (!cell.inMonth) {
    base.cursor = 'default';
  }
  if (isSelected) {
    base.background = 'var(--ink)';
    base.color = 'var(--paper)';
  }
  if (cell.isToday) {
    base.border = 'calc(2px * var(--sf)) solid var(--accent)';
  }
  return base;
}

function eventStyle(selected: boolean): CSSProperties {
  return {
    display: 'block',
    fontSize: 'calc(10px * var(--tf))',
    fontFamily: 'var(--mono)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginTop: 'calc(2px * var(--sf))',
    color: selected ? 'var(--paper)' : 'var(--ink)',
  };
}

export function CalendarMonth(props: CalendarMonthProps): ReactElement {
  const { value, events, onSelect, onMonthChange, today } = props;
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [activeIso, setActiveIso] = useState<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const cells = useMemo(() => buildGrid(value, events, today), [value, events, today]);

  const parsed = useMemo(() => fromISODate(value), [value]);
  const label = parsed ? monthLabel(parsed.getFullYear(), parsed.getMonth()) : '';

  const focusCell = useCallback((iso: string) => {
    const el = cellRefs.current.get(iso);
    if (el) el.focus();
  }, []);

  const handleFocus = useCallback((iso: string) => {
    setActiveIso(iso);
  }, []);

  const handleClick = useCallback((iso: string, inMonth: boolean) => {
    if (!inMonth) return;
    setSelectedIso(iso);
    setActiveIso(iso);
    onSelect?.(iso);
  }, [onSelect]);

  const handlePrev = useCallback(() => {
    if (!parsed) return;
    onMonthChange?.(toISODate(startOfMonth(addMonths(parsed, -1))));
  }, [parsed, onMonthChange]);

  const handleNext = useCallback(() => {
    if (!parsed) return;
    onMonthChange?.(toISODate(startOfMonth(addMonths(parsed, 1))));
  }, [parsed, onMonthChange]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const iso = event.currentTarget.dataset.iso;
    const inMonth = event.currentTarget.dataset.inMonth === 'true';
    if (!iso || !inMonth) return;

    let target: Date | null = null;
    switch (event.key) {
      case 'ArrowRight': target = addDays(fromISODate(iso) ?? new Date(), 1); break;
      case 'ArrowLeft': target = addDays(fromISODate(iso) ?? new Date(), -1); break;
      case 'ArrowDown': target = addDays(fromISODate(iso) ?? new Date(), 7); break;
      case 'ArrowUp': target = addDays(fromISODate(iso) ?? new Date(), -7); break;
      case 'Home': {
        const d = fromISODate(iso) ?? new Date();
        target = addDays(d, -((d.getDay() + 6) % 7));
        break;
      }
      case 'End': {
        const d = fromISODate(iso) ?? new Date();
        target = addDays(d, 6 - ((d.getDay() + 6) % 7));
        break;
      }
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleClick(iso, true);
        return;
      default: return;
    }

    if (target) {
      event.preventDefault();
      const targetISO = toISODate(target);
      if (cellRefs.current.has(targetISO)) {
        focusCell(targetISO);
        setActiveIso(targetISO);
        setSelectedIso(targetISO);
        onSelect?.(targetISO);
      }
    }
  }, [handleClick, focusCell, onSelect]);

  const dayNumStyle: CSSProperties = {
    fontSize: 'calc(12px * var(--tf))',
    fontWeight: 500,
    display: 'block',
  };

  const rows: DayCell[][] = [];
  for (let r = 0; r < cells.length; r += 7) {
    rows.push(cells.slice(r, r + 7));
  }

  return (
    <div style={{ fontFamily: 'var(--sans)', fontSize: 'calc(14px * var(--tf))', color: 'var(--ink)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'calc(8px * var(--sf))' }}>
        <h3 style={{ margin: 0, fontSize: 'calc(16px * var(--tf))', fontWeight: 600, color: 'var(--ink)' }}>
          {label}
        </h3>
        <div style={{ display: 'flex', gap: 'calc(4px * var(--sf))' }}>
          <button type="button" onClick={handlePrev} style={btnStyle}>
            Previous month
          </button>
          <button type="button" onClick={handleNext} style={btnStyle}>
            Next month
          </button>
        </div>
      </div>

      <div role="grid" aria-label={label}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(1px * var(--sf))', marginBottom: 'calc(2px * var(--sf))' }}>
          {WEEKDAY_NAMES.map((name) => (
            <div key={name} style={{ textAlign: 'center', fontSize: 'calc(11px * var(--tf))', fontFamily: 'var(--mono)', color: 'var(--ink)', padding: 'calc(4px * var(--sf))' }}>
              {name}
            </div>
          ))}
        </div>
        {rows.map((row, rowIdx) => (
          <div key={rowIdx} role="row" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 'calc(1px * var(--sf))' }}>
            {row.map((cell) => {
              const selected = selectedIso === cell.iso || activeIso === cell.iso;
              const hidden = !cell.inMonth;
              return (
                <div
                  key={cell.iso}
                  ref={(el) => {
                    if (el) cellRefs.current.set(cell.iso, el);
                    else cellRefs.current.delete(cell.iso);
                  }}
                  role="gridcell"
                  aria-label={cell.label}
                  aria-selected={selected ? 'true' : 'false'}
                  aria-hidden={hidden ? true : undefined}
                  tabIndex={hidden ? undefined : 0}
                  data-iso={cell.iso}
                  data-in-month={String(cell.inMonth)}
                  onClick={() => handleClick(cell.iso, cell.inMonth)}
                  onFocus={() => handleFocus(cell.iso)}
                  onKeyDown={handleKeyDown}
                  style={dayCellStyle(cell, selected)}
                >
                  <span style={dayNumStyle}>
                    {cell.day}
                    {cell.events.length > 0 ? '\u00A0' : ''}
                  </span>
                  {cell.events.map((ev, i) => (
                    <span key={i} style={eventStyle(selected)}>
                      {ev.title}
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
