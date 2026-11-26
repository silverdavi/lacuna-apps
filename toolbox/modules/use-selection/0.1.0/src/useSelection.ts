// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-selection 0.1.0: snapshot of lacuna-components useSelection at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useRef, useState } from 'react';

export interface UseSelectionOptions {
  mode: 'single' | 'multi' | 'range';
  initial?: number[];
}

export interface UseSelectionReturn {
  selected: ReadonlySet<number>;
  isSelected: (index: number) => boolean;
  toggle: (index: number) => void;
  clear: () => void;
  selectRange: (from: number, to: number) => void;
  selectAll: () => void;
}

const DEFAULT_MAX = 99;

function validIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0;
}

export function useSelection(options: UseSelectionOptions): UseSelectionReturn {
  const { mode, initial } = options;

  const [selected, setSelected] = useState<ReadonlySet<number>>(() => {
    if (!initial) return new Set<number>();
    return new Set(initial.filter(validIndex));
  });

  const maxSeenRef = useRef(-1);
  if (initial) {
    for (const i of initial) {
      if (validIndex(i) && i > maxSeenRef.current) maxSeenRef.current = i;
    }
  }

  const noteIndex = useCallback((index: number) => {
    if (validIndex(index) && index > maxSeenRef.current) {
      maxSeenRef.current = index;
    }
  }, []);

  const toggle = useCallback(
    (index: number) => {
      if (!validIndex(index)) return;
      noteIndex(index);
      setSelected((prev) => {
        if (mode === 'single') {
          return new Set([index]);
        }
        const next = new Set(prev);
        if (next.has(index)) {
          next.delete(index);
        } else {
          next.add(index);
        }
        return next;
      });
    },
    [mode, noteIndex],
  );

  const clear = useCallback(() => {
    setSelected(new Set());
  }, []);

  const selectRange = useCallback(
    (from: number, to: number) => {
      if (!validIndex(from) || !validIndex(to)) return;
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      noteIndex(hi);
      const next = new Set(selected);
      for (let i = lo; i <= hi; i++) next.add(i);
      setSelected(next);
    },
    [selected, noteIndex],
  );

  const selectAll = useCallback(() => {
    const hi = maxSeenRef.current;
    const upper = hi < 0 ? DEFAULT_MAX : hi;
    const next = new Set<number>();
    for (let i = 0; i <= upper; i++) next.add(i);
    setSelected(next);
  }, []);

  const isSelected = useCallback(
    (index: number) => selected.has(index),
    [selected],
  );

  return { selected, isSelected, toggle, clear, selectRange, selectAll };
}
