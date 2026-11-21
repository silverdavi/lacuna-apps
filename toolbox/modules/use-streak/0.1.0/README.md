<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useStreak at 9c7f3ab. -->

> `@lacuna/use-streak` `0.1.0`. To use it in an app: add `"@lacuna/use-streak": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-streak": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-streak'`.

# useStreak

A React hook that manages daily check-ins with persisted state and computes the current and longest streaks from them via `@lacuna/streak-calc`. Check-ins are stored through `@lacuna/use-collection`, so they survive a remount and a page reload. Used by habit trackers, goal trackers, and any app that records daily activity and displays streak progress.

## Signature

```ts
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

export function useStreak(options: UseStreakOptions): UseStreakReturn;
```

## Usage

```tsx
import { useState } from 'react';
import { useStreak } from '@lacuna/use-streak';

export function HabitTracker() {
  const { checkIns, streak, alive, checkIn, isCheckedIn } = useStreak({
    recordKey: 'morning-run',
    streakOptions: { today: '2024-01-03', skipDays: ['2024-01-02'] },
  });
  const [note, setNote] = useState('');

  return (
    <section>
      <h1>Morning run</h1>
      <p>
        current {streak.current} · longest {streak.longest} · alive {alive ? 'yes' : 'no'}
      </p>
      <p>{isCheckedIn('2024-01-03') ? 'Checked in today' : 'Not checked in today'}</p>
      <button type="button" onClick={() => checkIn('2024-01-03')}>
        Check in
      </button>
      <ul>
        {checkIns.map((date) => (
          <li key={date}>{date}</li>
        ))}
      </ul>
    </section>
  );
}
```
