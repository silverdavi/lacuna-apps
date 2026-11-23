// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/board-grid 0.1.0: snapshot of lacuna-components BoardGrid at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';

export interface BoardGridProps {
  rows: number;
  cols: number;
  cells: Array<Array<ReactNode>>;
  onCellClick?: (row: number, col: number) => void;
  onCellFocus?: (row: number, col: number) => void;
  selectedCell?: { row: number; col: number } | null;
  ariaLabel?: string;
  cellAriaLabel?: (row: number, col: number) => string;
}

const GRID: CSSProperties = {
  display: 'grid',
  gap: 'calc(4px * var(--sf))',
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
};

const CELL: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'calc(40px * var(--sf))',
  height: 'calc(40px * var(--sf))',
  boxSizing: 'border-box',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(6px * var(--sf))',
  background: 'var(--paper)',
  color: 'var(--ink)',
  cursor: 'pointer',
  userSelect: 'none',
  outline: 'none',
};

function cellContentText(content: ReactNode): string {
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content);
  }
  if (Array.isArray(content)) {
    return content.map(cellContentText).join('');
  }
  if (content && typeof content === 'object' && 'children' in content) {
    return cellContentText((content as { children?: ReactNode }).children);
  }
  return '';
}

export function BoardGrid(props: BoardGridProps) {
  const {
    rows,
    cols,
    cells,
    onCellClick,
    onCellFocus,
    selectedCell,
    ariaLabel,
    cellAriaLabel,
  } = props;

  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);

  useEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, rows * cols);
  }, [rows, cols]);

  const moveFocus = (row: number, col: number) => {
    const index = row * cols + col;
    setFocusIndex(index);
    cellRefs.current[index]?.focus();
    onCellFocus?.(row, col);
  };

  const activate = (row: number, col: number) => {
    moveFocus(row, col);
    onCellClick?.(row, col);
  };

  const onGridKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const key = event.key;
    const isArrow =
      key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowDown' || key === 'ArrowUp';
    if (focusIndex === null) {
      if (!isArrow) return;
      event.preventDefault();
      if (key === 'ArrowRight') moveFocus(0, Math.min(1, cols - 1));
      else if (key === 'ArrowDown') moveFocus(Math.min(1, rows - 1), 0);
      else moveFocus(0, 0);
      return;
    }
    const row = Math.floor(focusIndex / cols);
    const col = focusIndex % cols;
    switch (key) {
      case 'ArrowRight':
        event.preventDefault();
        if (col < cols - 1) moveFocus(row, col + 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        if (col > 0) moveFocus(row, col - 1);
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (row < rows - 1) moveFocus(row + 1, col);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (row > 0) moveFocus(row - 1, col);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        activate(row, col);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={gridRef}
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={rows}
      aria-colcount={cols}
      tabIndex={0}
      onKeyDown={onGridKeyDown}
      style={{
        ...GRID,
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        border: 'calc(1px * var(--sf)) solid var(--hair)',
        borderRadius: 'calc(8px * var(--sf))',
        padding: 'calc(8px * var(--sf))',
        background: 'var(--paper-deep)',
        outline: 'none',
      }}
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={`row-${row}`} role="row" style={{ display: 'contents' }}>
          {Array.from({ length: cols }, (_, col) => {
            const index = row * cols + col;
            const content = cells[row]?.[col] ?? null;
            const isSelected = selectedCell?.row === row && selectedCell?.col === col;
            const label = cellAriaLabel
              ? cellAriaLabel(row, col)
              : cellContentText(content);
            return (
              <div
                key={`cell-${index}`}
                role="gridcell"
                aria-selected={isSelected}
                aria-label={label || undefined}
                aria-rowindex={row + 1}
                aria-colindex={col + 1}
                ref={(el) => {
                  cellRefs.current[index] = el;
                }}
                tabIndex={-1}
                onClick={() => activate(row, col)}
                onFocus={() => {
                  setFocusIndex(index);
                  onCellFocus?.(row, col);
                }}
                style={{
                  ...CELL,
                  ...(isSelected
                    ? {
                        background: 'var(--ink)',
                        color: 'var(--paper)',
                        borderColor: 'var(--ink)',
                      }
                    : null),
                  ...(focusIndex === index
                    ? {
                        outline: 'calc(2px * var(--sf)) solid var(--accent)',
                        outlineOffset: 'calc(-calc(2px * var(--sf)))',
                      }
                    : null),
                }}
              >
                {content}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
