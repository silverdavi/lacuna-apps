<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components icsCalendar at 9c7f3ab. -->

> `@lacuna/ics-calendar` `0.1.0`. To use it in an app: add `"@lacuna/ics-calendar": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/ics-calendar": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/ics-calendar'`.

# icsCalendar

Logic utilities for the iCalendar (RFC 5545) `.ics` format: serialize a list of events (with optional recurrence) into an `.ics` string, parse `.ics` text back into events, validate that a string is a well-formed calendar, and convert recurrence rules to and from the `RRULE` format. Everything is pure — no DOM, no timezone engine, no external date library.

## Signature

```ts
export interface IcsEvent {
  id: string;
  summary: string;
  description?: string;
  startDate: string;     // 'YYYY-MM-DD' or 'YYYY-MM-DDTHH:mm:ss'
  endDate?: string;
  allDay: boolean;
  location?: string;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    maxOccurrences?: number;
    endDate?: string;
  };
}

export function toIcs(events: IcsEvent[]): string;
export function fromIcs(text: string): IcsEvent[];
export function validateIcs(text: string): boolean;
export function icsToRRule(rec: NonNullable<IcsEvent['recurrence']>): string;
export function rruleToIcsRec(rrule: string): NonNullable<IcsEvent['recurrence']>;
```

- `toIcs` emits a `BEGIN:VCALENDAR … END:VCALENDAR` body with one `VEVENT` per event. All-day events get `DTSTART;VALUE=DATE:YYYYMMDD`; timed events get `DTSTART:YYYYMMDDTHHMMSS`. Text fields (`SUMMARY`, `DESCRIPTION`, `LOCATION`) are escaped per the iCalendar TEXT value rules. Lines are joined with CRLF and are folded to 75 octets.
- `fromIcs` splits on CRLF or LF, folds lines back together, and returns one `IcsEvent` per `VEVENT`. The `id` is taken from the `UID` line; an event whose `VEVENT` block has no `END:VEVENT` is skipped.
- `validateIcs` checks that the text begins with `BEGIN:VCALENDAR`, ends with `END:VCALENDAR`, and that `VCALENDAR`/`VEVENT` blocks are balanced (no extra `END`).
- `icsToRRule` renders `FREQ=…;INTERVAL=…` plus `COUNT=…` / `UNTIL=YYYYMMDD` when set. `rruleToIcsRec` parses that back, accepting an optional leading `RRULE:` prefix and defaulting `INTERVAL` to 1.

## Usage

```tsx
import { toIcs, fromIcs, validateIcs, type IcsEvent } from '@lacuna/ics-calendar';

export function IcsDemo() {
  const events: IcsEvent[] = [
    { id: 'e1', summary: 'Team sync', startDate: '2024-03-15', allDay: true, location: 'Room A' },
    {
      id: 'e2',
      summary: 'Call',
      startDate: '2024-03-15T14:30:00',
      endDate: '2024-03-15T15:00:00',
      allDay: false,
      recurrence: { frequency: 'weekly', interval: 1, maxOccurrences: 4 },
    },
  ];
  const ics = toIcs(events);
  const ok = validateIcs(ics); // true
  const roundTripped = fromIcs(ics); // back to the same two events
  return (
    <div>
      <pre>{ics}</pre>
      <span>{ok ? 'valid' : 'invalid'} · {roundTripped.length} events</span>
    </div>
  );
}
```

## Behavior notes

- **Escaping.** `toIcs` escapes `\`, `,`, `;` and newlines in text fields; `fromIcs` reverses it. A round-trip of `toIcs` → `fromIcs` is lossless for well-formed input.
- **Dates.** Date input may be a plain date or an ISO datetime. `toIcs` normalizes to the compact basic form; `fromIcs` renders all-day dates back as `YYYY-MM-DD` and timed values back as `YYYY-MM-DDTHH:mm:ss`.
- **Recurrence.** Only `FREQ`, `INTERVAL`, `COUNT`, and `UNTIL` are understood. A malformed `RRULE` inside an imported calendar is dropped for that event rather than failing the whole parse; `rruleToIcsRec` throws on a malformed standalone rule.
- **Validation.** `validateIcs` is structural only — it does not verify individual property names or date validity.
