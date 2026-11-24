<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components dateMath at 9c7f3ab. -->

> `@lacuna/date-math` `0.1.0`. To use it in an app: add `"@lacuna/date-math": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/date-math": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/date-math'`.

# dateMath

Pure local-date arithmetic and formatting utilities for catalog apps: add or subtract days, weeks, and months (with end-of-month clamping), compute a `years / months / days` difference, find the start and end of the day, week, or month, get the ISO week number, calculate a person's age, and render a human-readable relative time string. Everything operates on local time with no timezone handling and no external date library dependencies.

## Signature

```ts
export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export interface DiffResult {
  years: number;
  months: number;
  days: number;
}

export function addDays(date: Date, days: number): Date;
export function addWeeks(date: Date, weeks: number): Date;
export function addMonths(date: Date, months: number): Date;
export function diff(a: Date, b: Date): DiffResult;
export function startOfDay(date: Date): Date;
export function endOfDay(date: Date): Date;
export function startOfWeek(date: Date, firstDay?: 0 | 1): Date;
export function endOfWeek(date: Date, firstDay?: 0 | 1): Date;
export function startOfMonth(date: Date): Date;
export function endOfMonth(date: Date): Date;
export function isoWeek(date: Date): number;
export function age(birth: Date, reference?: Date): number;
export function relativeTime(date: Date, reference?: Date): string;
export function toISODate(date: Date): string;
export function fromISODate(iso: string): Date | null;
```

## Usage

```tsx
import { addMonths, diff, relativeTime } from '@lacuna/date-math';

export function PlanStatus({ started, finished }: { started: Date; finished: Date }) {
  const nextMilestone = addMonths(started, 3);
  const elapsed = diff(started, finished);
  return (
    <p aria-label="Plan status">
      {relativeTime(finished)} — {elapsed.years}y {elapsed.months}m {elapsed.days}d,
      next milestone {nextMilestone.toDateString()}
    </p>
  );
}
```
