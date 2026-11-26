<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components formatDuration at 9c7f3ab. -->

> `@lacuna/format-duration` `0.1.0`. To use it in an app: add `"@lacuna/format-duration": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/format-duration": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/format-duration'`.

# formatDuration

Converts millisecond durations into zero-padded `h:mm:ss` strings and human-readable phrases like `1h 20m`, and parses those phrases back into milliseconds. Needed by any app that displays or edits time spans: timers, trackers, age calculators, and countdowns.

## Signature

```ts
export interface DurationParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function formatDuration(ms: number): string;
export function humanizeDuration(ms: number): string;
export function parseDuration(input: string): number;
export function toParts(ms: number): DurationParts;
```

`formatDuration` clamps negative and non-finite values to zero. `humanizeDuration` omits zero units and returns `''` for zero. `parseDuration` accepts a space-separated `Xh Ym Zs` pattern in any order and returns `0` for empty input.

## Usage

```tsx
import { formatDuration, humanizeDuration, parseDuration } from '@lacuna/format-duration';

const ms = 7800000;
const clock = formatDuration(ms);
const words = humanizeDuration(ms);
const back = parseDuration('2h 10m');
```
