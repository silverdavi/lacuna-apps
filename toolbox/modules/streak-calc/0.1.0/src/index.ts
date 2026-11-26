// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/streak-calc 0.1.0: snapshot of lacuna-components streakCalc at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
import { fromISODate, toISODate, addDays } from '@lacuna/date-math';

export interface StreakOptions {
  /** ISO date strings (YYYY-MM-DD) of allowed skip days; streaks are not broken on these. */
  skipDays?: string[];
  /** The "today" date to evaluate the current streak against (default: system today). */
  today?: string;
}

export interface StreakResult {
  /** Length of the current consecutive streak ending on or before `today`. */
  current: number;
  /** Length of the longest consecutive streak in the full set of check-ins. */
  longest: number;
  /** The start date (ISO) of the current streak, or null if current is 0. */
  currentStart: string | null;
  /** The start date (ISO) of the longest streak, or null if longest is 0. */
  longestStart: string | null;
}

function nextDay(iso: string): string {
  const d = fromISODate(iso);
  if (!d) return iso;
  return toISODate(addDays(d, 1));
}

function prevDay(iso: string): string {
  const d = fromISODate(iso);
  if (!d) return iso;
  return toISODate(addDays(d, -1));
}

function systemToday(): string {
  return toISODate(new Date());
}

interface Run {
  len: number;
  start: string;
}

/**
 * Compute current and longest streaks from a list of check-in dates.
 * @param checkIns - Array of ISO date strings (YYYY-MM-DD), order does not matter.
 * @param options - Optional skip days and reference "today".
 */
export function computeStreaks(checkIns: string[], options?: StreakOptions): StreakResult {
  const set = new Set<string>();
  for (const c of checkIns) set.add(c);
  const skipSet = new Set<string>(options?.skipDays ?? []);
  const today = options?.today ?? systemToday();

  const covered = (iso: string): boolean => set.has(iso) || skipSet.has(iso);

  // Current streak: walk backward from `today` while each day is a check-in
  // or an allowed skip day. Count only check-in days; a skip day neither
  // adds to the count nor breaks the run.
  let current = 0;
  let currentStart: string | null = null;
  let cursor = today;
  while (covered(cursor)) {
    if (set.has(cursor)) {
      current += 1;
      currentStart = cursor;
    }
    cursor = prevDay(cursor);
  }

  // Longest streak: for each check-in day that begins a run (the day before
  // it is not covered), extend forward while days stay covered and count
  // the check-in days reached.
  const days = [...set].sort();
  let longest = 0;
  let longestStart: string | null = null;
  for (const d of days) {
    if (covered(prevDay(d))) continue;
    let len = 0;
    let walk = d;
    while (covered(walk)) {
      if (set.has(walk)) len += 1;
      walk = nextDay(walk);
    }
    if (len > longest) {
      longest = len;
      longestStart = d;
    }
  }

  return {
    current,
    longest,
    currentStart,
    longestStart,
  };
}

/**
 * Check whether a given date is part of an active streak (i.e., the streak
 * would still be alive if the user checked in today).
 * @param checkIns - Array of ISO date strings.
 * @param options - Optional skip days and reference "today".
 * @returns true if the current streak is non-zero and `today` is within the streak window.
 */
export function isStreakAlive(checkIns: string[], options?: StreakOptions): boolean {
  return computeStreaks(checkIns, options).current > 0;
}
