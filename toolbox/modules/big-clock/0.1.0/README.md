<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components BigClock at 9c7f3ab. -->

> `@lacuna/big-clock` `0.1.0`. To use it in an app: add `"@lacuna/big-clock": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/big-clock": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/big-clock'`.

# BigClock

A large, high-contrast time display for timers, clocks, and countdowns. It shows hours, minutes, and seconds in a monospace font, with optional milliseconds. Used by Pomodoro timers, countdown timers, stopwatches, alarm clocks, and interval timers.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `ms` | `number` | — | Time to display in milliseconds. |
| `showMs` | `boolean` | `false` | If true, show milliseconds (two digits) after the seconds. |
| `countdown` | `boolean` | `true` | If true, display in countdown style (remaining time). If false, display as elapsed. |
| `label` | `string` | `'Time display'` | Accessible label for the time display. |
| `finished` | `boolean` | `false` | If true, the clock is in a "finished" state and shows a distinct style. |

## Usage

```tsx
import { BigClock } from '@lacuna/big-clock';

export function Timer() {
  return (
    <div>
      <BigClock ms={3661500} />
      <BigClock ms={1234567} showMs />
      <BigClock ms={3600000} countdown={false} label="Elapsed" />
      <BigClock ms={0} finished />
    </div>
  );
}
```
