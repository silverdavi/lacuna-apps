// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/use-streak 0.1.0: snapshot of lacuna-components useStreak at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useCollection } from '@lacuna/use-collection';
import { computeStreaks, isStreakAlive } from '@lacuna/streak-calc';
import type { StreakOptions, StreakResult } from '@lacuna/streak-calc';

export interface UseStreakOptions {
  /** Unique key for the persisted check-in collection. */
  recordKey: string;
  /** Optional skip days and reference "today" passed to streakCalc. */
  streakOptions?: StreakOptions;
}

export interface UseStreakReturn {
  /** All check-in dates as ISO strings (YYYY-MM-DD). */
  checkIns: string[];
  /** Current and longest streak computed from checkIns. */
  streak: StreakResult;
  /** Whether the streak is still alive (current streak includes today or yesterday). */
  alive: boolean;
  /** Record a check-in for the given date (idempotent). */
  checkIn: (date: string) => void;
  /** Remove a check-in for the given date. */
  removeCheckIn: (date: string) => void;
  /** Whether a check-in already exists for the given date. */
  isCheckedIn: (date: string) => boolean;
}

export function useStreak(options: UseStreakOptions): UseStreakReturn {
  const { recordKey, streakOptions } = options;
  const { state, actions } = useCollection<string>({
    storageKey: `useStreak:${recordKey}`,
  });

  const checkIns = useMemo(
    () => state.items.map((item) => item.data),
    [state.items],
  );

  const set = useMemo(
    () => new Set(checkIns),
    [checkIns],
  );

  const streak = useMemo(
    () => computeStreaks(checkIns, streakOptions),
    [checkIns, streakOptions],
  );

  const alive = useMemo(
    () => isStreakAlive(checkIns, streakOptions),
    [checkIns, streakOptions],
  );

  const pendingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    pendingRef.current = new Set(checkIns);
  }, [checkIns]);

  const checkIn = useCallback(
    (date: string): void => {
      if (pendingRef.current.has(date)) return;
      pendingRef.current.add(date);
      actions.add(date);
    },
    [actions],
  );

  const removeCheckIn = useCallback(
    (date: string): void => {
      pendingRef.current.delete(date);
      for (const item of state.items) {
        if (item.data === date) {
          actions.remove(item.id);
          return;
        }
      }
    },
    [actions, state.items],
  );

  const isCheckedIn = useCallback(
    (date: string): boolean => set.has(date),
    [set],
  );

  return { checkIns, streak, alive, checkIn, removeCheckIn, isCheckedIn };
}
