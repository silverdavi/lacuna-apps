<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components streakCalc at 9c7f3ab. -->

> `@lacuna/streak-calc` `0.1.0`. To use it in an app: add `"@lacuna/streak-calc": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/streak-calc": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/streak-calc'`.

# streakCalc

Pure functions that compute the current and longest consecutive-day streaks from a set of dated check-ins, with support for allowed skip days that do not break a streak. Used by habit trackers, goal trackers, and any app that rewards consistent daily activity. All dates are plain ISO strings (`YYYY-MM-DD`) treated as local calendar days; no timezone handling or time-of-day granularity.

## Signature

```ts
import type { LocalDate } from '@lacuna/date-math';

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

export function computeStreaks(checkIns: string[], options?: StreakOptions): StreakResult;
export function isStreakAlive(checkIns: string[], options?: StreakOptions): boolean;
```

## Usage

```tsx
import { computeStreaks, isStreakAlive } from '@lacuna/streak-calc';

const checkIns = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-05', '2024-01-06'];
const { current, longest, currentStart } = computeStreaks(checkIns, { today: '2024-01-06' });
const alive = isStreakAlive(checkIns, { today: '2024-01-06' });
console.log(`current=${current} longest=${longest} start=${currentStart} alive=${alive}`);
```
