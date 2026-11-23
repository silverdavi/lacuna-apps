// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/gantt-bars 0.1.0: snapshot of lacuna-components GanttBars at 02e5289 by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactElement } from 'react';
import { addDays, fromISODate, toISODate } from '@lacuna/date-math';
import type { GanttBar, GanttBarsProps } from './index';

const ROW_GAP = 8;
const BAR_HEIGHT = 24;

function shiftBar(bar: GanttBar, days: number): GanttBar {
  const start = fromISODate(bar.start);
  const end = fromISODate(bar.end);
  if (!start || !end) return bar;
  return { ...bar, start: toISODate(addDays(start, days)), end: toISODate(addDays(end, days)) };
}

export function GanttBars({ bars, onBarsChange, width = 800, height = 300, dayWidth = 20, onDragStart, onDragEnd, ariaLabel = 'Gantt timeline' }: GanttBarsProps): ReactElement {
  const dragRef = useRef<{ id: string; startX: number } | null>(null);
  const [draft, setDraft] = useState<Record<string, number>>({});

  const barsWithDelta = useMemo(
    () => bars.map((bar) => ({ ...bar, delta: draft[bar.id] ?? 0 })),
    [bars, draft],
  );

  const earliestStart = useMemo(
    () =>
      barsWithDelta.reduce((min: Date | null, bar) => {
        const date = fromISODate(bar.start);
        if (!date) return min;
        return min === null || date < min ? date : min;
      }, null),
    [barsWithDelta],
  );

  const dayAt = (iso: string): number => {
    const date = fromISODate(iso);
    if (!date || !earliestStart) return 0;
    return Math.round((date.getTime() - earliestStart.getTime()) / 86400000);
  };

  const dayIndexAt = (index: number): number => {
    const bar = barsWithDelta[index];
    if (!bar) return 0;
    return dayAt(bar.start) + (draft[bar.id] ?? 0);
  };

  const barWidth = (index: number): number => {
    const bar = barsWithDelta[index];
    if (!bar) return 0;
    return Math.max(dayWidth, (dayAt(bar.end) - dayAt(bar.start) + 1) * dayWidth);
  };
  const barX = (index: number): number => dayIndexAt(index) * dayWidth;
  const rowTop = (index: number): number => ROW_GAP + index * (BAR_HEIGHT + ROW_GAP);
  const rowMidY = (index: number): number => rowTop(index) + BAR_HEIGHT / 2;

  const dependencies = useMemo(() => {
    const result: Array<{ key: string; path: string }> = [];
    bars.forEach((bar, index) => {
      for (const depId of bar.dependsOn ?? []) {
        const depIndex = bars.findIndex((b) => b.id === depId);
        if (depIndex < 0) continue;
        const x1 = barX(depIndex) + barWidth(depIndex);
        const y1 = rowMidY(depIndex);
        const x2 = barX(index);
        const y2 = rowMidY(index);
        const dx = x2 - x1;
        const midX = dx > 0 ? x1 + dx / 2 : x1 + dayWidth * 0.5;
        result.push({ key: `${depId}->${bar.id}`, path: `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}` });
      }
    });
    return result;
  }, [bars, dayWidth, draft]);

  useEffect(() => {
    (document.querySelector('[data-gantt-bar]') as HTMLElement | null)?.focus();
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>, id: string) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id, startX: event.clientX };
    onDragStart?.();
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setDraft((prev) => ({ ...prev, [drag.id]: Math.round((event.clientX - drag.startX) / dayWidth) }));
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    const deltaDays = draft[drag.id] ?? 0;
    if (deltaDays !== 0) onBarsChange(bars.map((bar) => (bar.id === drag.id ? shiftBar(bar, deltaDays) : bar)));
    setDraft((prev) => ({ ...prev, [drag.id]: 0 }));
    onDragEnd?.();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, index: number) => {
    const bar = bars[index];
    if (!bar) return;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowLeft':
        event.preventDefault();
        onBarsChange(bars.map((b) => (b.id === bar.id ? shiftBar(b, event.key === 'ArrowRight' ? 1 : -1) : b)));
        break;
      case 'ArrowDown':
      case 'ArrowUp': {
        event.preventDefault();
        const next = index + (event.key === 'ArrowDown' ? 1 : -1);
        if (next >= 0 && next < bars.length) {
          const nodes = document.querySelectorAll('[data-gantt-bar]');
          const node = nodes[next];
          if (node instanceof HTMLElement) node.focus();
        }
        break;
      }
      case 'Escape':
        break;
      default:
        break;
    }
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    boxSizing: 'border-box',
    overflow: 'hidden',
    background: 'var(--paper)',
    border: 'calc(1px * var(--sf)) solid var(--hair)',
    borderRadius: 'calc(2px * var(--sf))',
  };

  const barStyle = (index: number): CSSProperties => ({
    position: 'absolute',
    left: `${barX(index)}px`,
    top: `${rowTop(index)}px`,
    width: `${barWidth(index)}px`,
    height: `${BAR_HEIGHT}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    background: 'var(--paper-deep)',
    border: 'calc(1px * var(--sf)) solid var(--ink)',
    borderRadius: 'calc(2px * var(--sf))',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    cursor: 'grab',
    touchAction: 'none',
    userSelect: 'none',
  });

  const svgHeight = Math.max(bars.length * (BAR_HEIGHT + ROW_GAP) + ROW_GAP, height);

  return (
    <div
      role={bars.length === 0 ? 'group' : 'application'}
      aria-label={ariaLabel}
      style={{ ...containerStyle, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <svg
        width={width}
        height={svgHeight}
        viewBox={`0 0 ${width} ${svgHeight}`}
        style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}
        aria-hidden="true"
        focusable="false"
      >
        {dependencies.map((dep) => (
          <path key={dep.key} d={dep.path} fill="none" stroke="var(--ink)" strokeWidth={2} />
        ))}
      </svg>
      {barsWithDelta.map((bar, index) => (
        <div
          key={bar.id}
          data-gantt-bar={bar.id}
          role="group"
          aria-label={bar.label}
          tabIndex={index === 0 ? 0 : -1}
          onPointerDown={(e) => onPointerDown(e, bar.id)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onKeyDown={(e) => onKeyDown(e, index)}
          style={barStyle(index)}
        >
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 'calc(11px * var(--tf))',
              color: 'var(--ink)',
              paddingInline: 'calc(6px * var(--sf))',
            }}
          >
            {bar.label}
          </span>
        </div>
      ))}
      {bars.length === 0 ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--mono)',
            fontSize: 'calc(11px * var(--tf))',
            color: 'var(--ink-60)',
          }}
        >
          No tasks
        </div>
      ) : null}
    </div>
  );
}
