<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components recurrence at 9c7f3ab. -->

> `@lacuna/recurrence` `0.1.0`. To use it in an app: add `"@lacuna/recurrence": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/recurrence": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/recurrence'`.

# recurrence

Pure functions that model daily, weekly, monthly, and yearly repeat rules with a configurable interval, an optional end date, and a "next N occurrences" limit, and expand a rule into a list of concrete local-date strings. Calendar, planner, and tracker apps use it to turn a rule into dates without pulling in a date library. It also round-trips a rule to and from a minimal RRULE string (`FREQ`; `INTERVAL`; `COUNT`/`UNTIL`).

## Signature

```ts
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
}

export function parseRule(input: string): RecurrenceRule;
export function nextOccurrences(rule: RecurrenceRule, count: number): string[];
export function isRecurring(rule: RecurrenceRule, date: string): boolean;
export function occurrencesBetween(rule: RecurrenceRule, from: string, to: string): string[];
export function ruleToRRule(rule: RecurrenceRule): string;
export function rruleToRule(rrule: string, startDate: string): RecurrenceRule;
```

## Usage

```tsx
import { parseRule, nextOccurrences, isRecurring, ruleToRRule } from '@lacuna/recurrence';

const rule = parseRule('FREQ=WEEKLY;INTERVAL=2;START=2024-01-01;COUNT=3');
const dates = nextOccurrences(rule, 3);
const matches = isRecurring(rule, '2024-01-15');
const rrule = ruleToRRule(rule);

export function Upcoming() {
  return (
    <ul aria-label="Upcoming occurrences">
      {dates.map((d) => (
        <li key={d}>{d}{matches && d === '2024-01-15' ? ' (next)' : ''}</li>
      ))}
      <li aria-label="Rule">{rrule}</li>
    </ul>
  );
}
```
