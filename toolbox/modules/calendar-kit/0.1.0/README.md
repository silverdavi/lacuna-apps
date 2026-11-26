<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CalendarKit at aba0238. -->

> `@lacuna/calendar-kit` `0.1.0`. To use it in an app: add `"@lacuna/calendar-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/calendar-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/calendar-kit'`.

# CalendarKit

A calendar application panel that renders events in a month or week view. Users switch views with the toggle, open a record form to create an event for a selected day, optionally define recurrence rules, and import or export events as iCalendar. Recurring events expand into their occurrences for display in both views.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `events` | `KitEvent[]` | Optional initial events. Each event has `id`, `title`, an ISO `date`, and an optional `recurrence` rule. |
| `showRecurrence` | `boolean` | When set, the event form includes recurrence fields and events with a recurrence render their occurrences. |
| `showIcs` | `boolean` | When set, shows Import ICS and Export ICS controls. |
| `style` | `CSSProperties` | Optional inline style applied to the root region. |

## Event shape

```ts
type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface KitEvent {
  id: string;
  title: string;
  date: string;
  recurrence?: {
    date: string;
    frequency: RecurrenceFrequency;
    interval: number;
    endDate?: string;
    count?: number;
  };
}
```

## Usage

```tsx
import { CalendarKit } from '@lacuna/calendar-kit';

export function App() {
  return (
    <CalendarKit
      events={[
        { id: 'e1', title: 'Design review', date: '2026-11-24' },
        { id: 'e2', title: 'Standup', date: '2026-11-02', recurrence: { date: '2026-11-02', frequency: 'weekly', interval: 1, endDate: '2026-11-30' } },
      ]}
      showRecurrence
      showIcs
    />
  );
}
```
