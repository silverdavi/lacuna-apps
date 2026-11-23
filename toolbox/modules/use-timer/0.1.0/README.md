<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useTimer at 9c7f3ab. -->

> `@lacuna/use-timer` `0.1.0`. To use it in an app: add `"@lacuna/use-timer": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-timer": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-timer'`.

# useTimer

A drift-free countdown and stopwatch hook. It tracks elapsed or remaining time from timestamps rather than interval accumulation, so the reading never drifts no matter how often the component re-renders. It supports pause/resume, lap recording, a configurable countdown duration, and persists its state to `localStorage` so it survives page reloads (a timer that was running when the page closed picks up where it left off). Needed by time-tracking, Pomodoro, countdown, and stopwatch apps.

## Signature

```ts
import { useCallback, useEffect, useRef, useState } from 'react';

export interface TimerOptions {
  /** Initial duration in milliseconds. If omitted, the timer runs as a stopwatch (no end). */
  initialDurationMs?: number;
  /** Key under which state is persisted in localStorage. Defaults to 'lacuna-timer'. */
  storageKey?: string;
  /** If true, the timer starts running on mount (or after reload). Defaults to false. */
  autoStart?: boolean;
}

export interface TimerState {
  /** True when the timer is actively counting. */
  running: boolean;
  /** Elapsed milliseconds since start (stopwatch) or since last reset. */
  elapsedMs: number;
  /** Remaining milliseconds (countdown only; equals initialDurationMs − elapsedMs). Null for stopwatch. */
  remainingMs: number | null;
  /** Recorded lap times in milliseconds, oldest first. */
  laps: number[];
}

export interface TimerControls {
  /** Start or resume the timer. No-op if already running. */
  start: () => void;
  /** Pause the timer. No-op if not running. */
  pause: () => void;
  /** Reset elapsed time to zero and clear laps. If countdown, remaining resets to initialDurationMs. */
  reset: () => void;
  /** Record a lap (stopwatch only). Returns the new laps array. */
  lap: () => number[];
  /** Set a new duration for countdown mode. Resets the timer. */
  setDuration: (ms: number) => void;
}

export function useTimer(options?: TimerOptions): [TimerState, TimerControls];
```

`useTimer` works as a countdown when `initialDurationMs` is provided (`remainingMs` counts down to `0`, at which point the timer stops) and as a stopwatch when it is omitted (`remainingMs` is `null`, `elapsedMs` counts up). `lap()` records the current elapsed time as a lap and keeps counting. The hook re-renders on a 25 ms interval while running so the readout stays live.

## Usage

```tsx
import { useTimer } from '@lacuna/use-timer';

function Pomodoro() {
  const [state, controls] = useTimer({ initialDurationMs: 25 * 60000, storageKey: 'pomodoro' });
  const mm = Math.floor((state.remainingMs ?? 0) / 60000);
  const ss = Math.floor(((state.remainingMs ?? 0) % 60000) / 1000);
  return (
    <div>
      <p>{mm}:{String(ss).padStart(2, '0')}</p>
      <button onClick={state.running ? controls.pause : controls.start}>
        {state.running ? 'Pause' : 'Start'}
      </button>
      <button onClick={controls.reset}>Reset</button>
    </div>
  );
}
```
