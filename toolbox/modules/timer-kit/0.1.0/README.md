<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components TimerKit at 971986c. -->

> `@lacuna/timer-kit` `0.1.0`. To use it in an app: add `"@lacuna/timer-kit": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/timer-kit": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/timer-kit'`.

# TimerKit

A complete timer composition: a BigClock time display, a ProgressRing showing remaining time, Start / Pause / Reset controls, optional phase cycling (e.g. Focus then Break), an alarm tone on phase completion via `toneSynth`, and a screen wake lock while the timer runs. Built on `useTimer` so the readout is drift-free, and `useWakeLock` so the screen stays on. Used by Pomodoro timers, countdown timers, stopwatches, alarm clocks, and interval timers.

## Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `phases` | `TimerPhase[]` | — | Phases to cycle through. Omit for a single-phase countdown. |
| `initialDurationMs` | `number` | `25 * 60 * 1000` | Duration for single-phase mode. |
| `alarm` | `boolean` | `true` | Play a tone when a phase finishes. |
| `wakeLock` | `boolean` | `true` | Request a screen wake lock while running. |
| `label` | `string` | `'Timer'` | Accessible label; also the `role="timer"` name. |
| `clockRender` | `(ms: number, finished: boolean) => ReactNode` | — | Custom clock area; BigClock by default. |
| `progressRender` | `(value: number, max: number, label: string) => ReactNode` | — | Custom progress area; ProgressRing by default. |
| `onPhaseComplete` | `(phaseIndex: number) => void` | — | Called when a phase completes. |
| `onReset` | `() => void` | — | Called on a full reset. |

`setTone(fn)` swaps the alarm tone implementation (default: a short sine blip via `AudioContext`); `playAlarm()` plays the current tone. When a phase completes with `alarm` on, the kit's status region (`role="status"`, an ARIA live region) announces `Alarm played: tone`; with `alarm` off the region stays silent.

## Usage

```tsx
import { TimerKit } from '@lacuna/timer-kit';

function Pomodoro() {
  return (
    <TimerKit
      label="Pomodoro"
      phases={[
        { label: 'Focus', durationMs: 25 * 60 * 1000 },
        { label: 'Break', durationMs: 5 * 60 * 1000 },
      ]}
    />
  );
}
```
