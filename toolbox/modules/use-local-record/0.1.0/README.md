<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useLocalRecord at 9c7f3ab. -->

> `@lacuna/use-local-record` `0.1.0`. To use it in an app: add `"@lacuna/use-local-record": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-local-record": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-local-record'`.

# useLocalRecord

A React hook that persists a single typed, versioned record to `localStorage` and returns the current value plus a setter. On first read it migrates the stored record forward through the versions you supply, so catalog apps (Time Tracker, Task List, Quick Notes, ...) can evolve their local schema without losing user data. It reports whether the value came from storage via `hydrated`.

## Signature

```ts
import type { Dispatch, SetStateAction } from 'react';

export interface Migration<TOld, TNew> {
  (old: TOld): TNew;
}

export interface UseLocalRecordOptions<T> {
  /** Unique key under which the record is stored in localStorage. */
  key: string;
  /** Current schema version of the record. */
  version: number;
  /** Value to use when no record exists or the stored version is lower than 0. */
  defaultValue: T;
  /**
   * Map from a previously stored version number to a migration function
   * that upgrades the record to the next version.
   * Keys must be integers from 0 up to (version - 1).
   */
  migrations?: Record<number, Migration<unknown, unknown>>;
}

export interface UseLocalRecordReturn<T> {
  /** The current record value (migrated to the latest version). */
  value: T;
  /** Setter that persists the new value to localStorage. */
  set: Dispatch<SetStateAction<T>>;
  /** True if the record was loaded from storage (possibly migrated). */
  hydrated: boolean;
}

export function useLocalRecord<T>(
  options: UseLocalRecordOptions<T>,
): UseLocalRecordReturn<T>;
```

## Usage

```tsx
import { useLocalRecord } from '@lacuna/use-local-record';

type Settings = { volume: number; dark: boolean };

export function PlayerSettings() {
  const { value, set, hydrated } = useLocalRecord<Settings>({
    key: 'player-settings',
    version: 2,
    defaultValue: { volume: 0.8, dark: false },
    migrations: {
      0: (old) => ({ volume: (old as { volume: number }).volume, dark: false }),
      1: (old) => ({ volume: (old as { volume: number }).volume * 0.9, dark: false }),
    },
  });

  return (
    <button
      type="button"
      onClick={() => set((prev) => ({ ...prev, dark: !prev.dark }))}
      aria-label={hydrated ? 'Toggle dark mode' : 'Dark mode'}
    >
      {value.dark ? 'Dark' : 'Light'}
    </button>
  );
}
```
