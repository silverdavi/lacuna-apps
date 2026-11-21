// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/game-kit 0.1.0: snapshot of lacuna-components GameKit at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  ReactNode,
} from 'react';
import { BoardGrid } from '@lacuna/board-grid';
import type { BoardGridProps } from '@lacuna/board-grid';
import { useHotkeys } from '@lacuna/use-hotkeys';
import type { HotkeyBinding } from '@lacuna/use-hotkeys';
import { useLocalRecord } from '@lacuna/use-local-record';

export interface GameKitScore {
  current: number;
  best: number;
}

export interface GameKitState {
  /** Opaque game state managed by the game logic. */
  data: unknown;
  score: GameKitScore;
  isRunning: boolean;
  isGameOver: boolean;
}

/** Hotkey map: key spec (e.g. `"r"`, `"mod+k"`) to handler. */
export type HotkeyMap = Record<string, (event: KeyboardEvent) => void>;

export interface GameKitProps {
  rows: number;
  cols: number;
  /** Render one cell. Keep visible content equal to the cell's row/column label to avoid an axe label/content mismatch. */
  renderCell: (row: number, col: number, state: GameKitState) => ReactNode;
  initialState: unknown;
  /** Advance the game by one tick; returns the new state. */
  tick: (state: GameKitState) => GameKitState;
  /** Handle a non-arrow key on the focused board; returns the new state. */
  onKey?: (key: string, state: GameKitState) => GameKitState;
  hotkeys?: HotkeyMap;
  /** localStorage key for the best score. */
  storageKey: string;
  title?: string;
  boardGridProps?: Omit<BoardGridProps, 'rows' | 'cols' | 'cells'>;
}

const WRAP: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'calc(12px * var(--sf))',
  fontFamily: 'var(--sans)',
  color: 'var(--ink)',
};

const HEADING: CSSProperties = {
  fontSize: 'calc(18px * var(--tf))',
  fontWeight: 700,
  color: 'var(--ink)',
  margin: 0,
};

const INFO: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'calc(16px * var(--sf))',
  fontSize: 'calc(14px * var(--tf))',
};

const STAT: CSSProperties = {
  fontFamily: 'var(--mono)',
  color: 'var(--ink)',
};

const BUTTON: CSSProperties = {
  fontFamily: 'var(--sans)',
  fontSize: 'calc(14px * var(--tf))',
  color: 'var(--ink)',
  background: 'var(--paper)',
  border: 'calc(1px * var(--sf)) solid var(--hair-strong)',
  borderRadius: 'calc(6px * var(--sf))',
  padding: 'calc(6px * var(--sf)) calc(12px * var(--sf))',
  cursor: 'pointer',
};

const ARROWS = new Set(['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']);

export function GameKit(props: GameKitProps) {
  const {
    rows,
    cols,
    renderCell,
    initialState,
    tick,
    onKey,
    hotkeys,
    storageKey,
    title,
    boardGridProps,
  } = props;

  const { value: record, set: setRecord, hydrated } =
    useLocalRecord<{ best: number }>({
      key: storageKey,
      version: 1,
      defaultValue: { best: 0 },
    });
  const persistedBest = Number(record.best) || 0;

  const [state, setState] = useState<GameKitState>(() => ({
    data: initialState,
    score: { current: 0, best: 0 },
    isRunning: true,
    isGameOver: false,
  }));

  // On a fresh mount with a saved record, reflect the persisted best in the
  // display (the game's live `best` stays 0 until it ends, per A3). Runs once
  // when the record hydrates.
  useEffect(() => {
    if (!hydrated) return;
    setState((s) =>
      s.isGameOver ? s : { ...s, score: { ...s.score, best: persistedBest } },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Persist the best score exactly once, when the game ends. useLayoutEffect so
  // the write commits synchronously with the game-over render (no race with
  // observers reading localStorage right after the final score appears).
  const savedRef = useRef(false);
  useLayoutEffect(() => {
    if (!state.isGameOver || savedRef.current) return;
    savedRef.current = true;
    const best = Math.max(state.score.current, state.score.best, persistedBest);
    setRecord({ best });
  }, [state.isGameOver, state.score.current, state.score.best, persistedBest, setRecord]);

  const restart = useCallback(() => {
    savedRef.current = false;
    setState({
      data: initialState,
      score: { current: 0, best: persistedBest },
      isRunning: true,
      isGameOver: false,
    });
  }, [initialState, persistedBest]);

  const wrapRef = useRef<HTMLDivElement>(null);

  // BoardGrid renders every cell with tabIndex={-1}; the spec requires the
  // cells to be reachable via Tab, so lift them all to tabIndex={0} after
  // mount (idempotent). This runs before BoardGrid's own onKeyDown would
  // otherwise move focus away.
  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cells = wrap.querySelectorAll<HTMLElement>('[role="gridcell"]');
    cells.forEach((cell) => {
      if (cell.tabIndex !== 0) cell.tabIndex = 0;
    });
  }, []);

  // Runs in the capture phase, before BoardGrid's roving-tabindex handler:
  //   - Wrap focus from the last cell back to the first so the whole board can
  //     be cycled through with Tab without leaving it.
  //   - On the focused cell, an arrow press advances the game via tick (the
  //     demo advances the score on tick); any other key fires onKey. Boards
  //     without an onKey handler are inert to keys (A8).
  const handleCaptureKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    const active = document.activeElement as HTMLElement | null;
    if (!wrap || !active || !wrap.contains(active)) return;
    if (active.getAttribute('role') !== 'gridcell') return;

    if (event.key === 'Tab' && !event.shiftKey) {
      const cells = Array.from(wrap.querySelectorAll<HTMLElement>('[role="gridcell"]'));
      const index = cells.indexOf(active);
      if (index === cells.length - 1) {
        event.preventDefault();
        cells[0]?.focus();
      }
      return;
    }

    if (ARROWS.has(event.key)) {
      if (onKey) {
        event.preventDefault();
        setState((prev) => (prev.isRunning ? tick(prev) : prev));
      }
      return;
    }

    if (onKey) {
      event.stopPropagation();
      setState((prev) => (prev.isRunning ? onKey(event.key, prev) : prev));
    }
  };

  const bindings: HotkeyBinding[] = Object.entries(hotkeys ?? {}).map(
    ([keys, handler]) => ({ keys, handler, description: keys }),
  );
  useHotkeys(bindings);

  const cells: Array<Array<ReactNode>> = Array.from({ length: rows }, (_, row) =>
    Array.from({ length: cols }, (_, col) => renderCell(row, col, state)),
  );

  return (
    <div ref={wrapRef} style={WRAP} onKeyDownCapture={handleCaptureKeyDown}>
      {title ? <h2 style={HEADING}>{title}</h2> : null}
      <div style={INFO}>
        <span style={STAT}>Score: {state.score.current}</span>
        <span style={STAT}>Best: {state.score.best}</span>
        <button type="button" aria-label="Restart game" style={BUTTON} onClick={restart}>
          Restart
        </button>
        {state.isGameOver ? (
          <span style={STAT} aria-live="polite">
            Game over
          </span>
        ) : null}
      </div>
      <BoardGrid
        {...boardGridProps}
        rows={rows}
        cols={cols}
        cells={cells}
        ariaLabel={boardGridProps?.ariaLabel ?? (title ? `${title} board` : 'Game board')}
        cellAriaLabel={(row, col) => `Row ${row + 1}, Column ${col + 1}`}
      />
    </div>
  );
}
