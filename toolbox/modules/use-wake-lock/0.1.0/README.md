<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useWakeLock at 9c7f3ab. -->

> `@lacuna/use-wake-lock` `0.1.0`. To use it in an app: add `"@lacuna/use-wake-lock": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-wake-lock": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-wake-lock'`.

# useWakeLock

A React hook that keeps the screen awake by requesting a [Wake Lock](https://developer.mozilla.org/en-US/docs/Web/API/Wake_Lock_API) while a component is active. It reports whether the API is available, exposes the current lock state, and provides manual `release` and `acquire` controls. When the API is missing (older browsers) it simply reports `isSupported: false` and never throws. Useful for timers, stopwatches, and alarm clocks that must not let the screen sleep during active use.

## Signature

```ts
export interface UseWakeLockOptions {
  /** Whether to request the wake lock (default true) */
  active?: boolean;
  /** Type of wake lock: 'screen' or 'playback' (default 'screen') */
  type?: 'screen' | 'playback';
}

export interface UseWakeLockReturn {
  /** Whether the wake lock is currently held */
  isLocked: boolean;
  /** Whether the Wake Lock API is available in this browser */
  isSupported: boolean;
  /** Manually release the wake lock */
  release: () => void;
  /** Manually re-acquire the wake lock */
  acquire: () => void;
}

export function useWakeLock(options?: UseWakeLockOptions): UseWakeLockReturn;
```

## Usage

```tsx
import { useState } from 'react';
import { useWakeLock } from '@lacuna/use-wake-lock';

export function TimerWithKeepscreen() {
  const [running, setRunning] = useState(false);
  const { isLocked, isSupported, release } = useWakeLock({ active: running });
  return (
    <div>
      <button onClick={() => setRunning((v) => !v)}>
        {running ? 'Pause' : 'Start'}
      </button>
      <p>
        {isSupported
          ? isLocked
            ? 'Screen is kept awake'
            : 'Screen may sleep'
          : 'Wake Lock not supported'}
      </p>
      <button onClick={release}>Release</button>
    </div>
  );
}
```
