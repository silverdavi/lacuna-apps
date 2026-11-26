<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components CalendarMonth at f879fb0. -->

> `@lacuna/calendar-month` `0.1.0`. To use it in an app: add `"@lacuna/calendar-month": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/calendar-month": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/calendar-month'`.

# CalendarMonth

A month-view calendar grid that displays events on each day, supports single-day selection with keyboard navigation, and navigates between months. Used by scheduling, planning, and appointment apps that need a familiar month-at-a-glance interface.

## Props

| Prop | Type | Description |
|------|------|-------------|
| `value` | `string` | The month to display, as an ISO date in that month, e.g. `"2025-06-01"`. |
| `events` | `CalendarEvent[]` | Events to render on the grid. |
| `onSelect` | `(date: string) => void` | Called with the ISO date string of the selected day. |
| `onMonthChange` | `(date: string) => void` | Called when the user navigates to a different month; receives the new month's first-day ISO date. |
| `today` | `string` | Optional ISO date string to highlight as "today". Defaults to the current date. |

## Usage

```tsx
import { useState } from 'react';
import { CalendarMonth } from '@lacuna/calendar-month';

export function MyApp() {
  const [month, setMonth] = useState('2025-06-01');
  const events = [
    { date: '2025-06-15', title: 'Meeting' },
  ];
  return (
    <CalendarMonth
      value={month}
      events={events}
      onMonthChange={setMonth}
      onSelect={(date) => console.log('selected', date)}
    />
  );
}
```
