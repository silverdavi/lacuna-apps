<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components hostMock at 6e67435. -->

> `@lacuna/host-mock` `0.1.0`. To use it in an app: add `"@lacuna/host-mock": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/host-mock": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/host-mock'`.

# hostMock

A localStorage-backed mock store for apps' `src/host/mock.ts`, so apps stop
hand-writing the same read-parse-validate-write code. It provides a record list
store for collections (entries, cards, accounts) and a single-value store for
settings and state, both safe against corrupt or missing storage: bad JSON,
non-array values, and elements that fail validation are dropped without
throwing, and a storage whose `setItem` throws (quota, private mode) degrades to
in-memory data for that store.

## Signature

```ts
export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export type MockRecordStore<T extends { id: string }> = {
  list(): T[];
  get(id: string): T | undefined;
  add(record: Omit<T, 'id'> & { id?: string }): T;
  update(id: string, patch: Partial<Omit<T, 'id'>>): T | undefined;
  remove(id: string): boolean;
  replaceAll(records: T[]): void;
  clear(): void;
};

export type MockValue<T> = {
  get(): T;
  set(value: T): void;
  clear(): void;
};

export function createMemoryStorage(): StorageLike;
export function createMockRecordStore<T extends { id: string }>(options: {
  key: string;
  validate?: (value: unknown) => value is T;
  idPrefix?: string;
  storage?: StorageLike;
}): MockRecordStore<T>;
export function createMockValue<T>(options: {
  key: string;
  fallback: T;
  validate?: (value: unknown) => value is T;
  storage?: StorageLike;
}): MockValue<T>;
```

## Usage

```tsx
import {
  createMemoryStorage,
  createMockRecordStore,
  createMockValue,
} from '@lacuna/host-mock'

type Entry = { id: string; title: string }

export function Example() {
  const storage = createMemoryStorage()
  const entries = createMockRecordStore<Entry>({
    key: 'entries',
    storage,
    validate: (v: unknown): v is Entry =>
      typeof (v as { title?: unknown }).title === 'string',
  })
  const prefs = createMockValue<{ dark: boolean }>({
    key: 'prefs',
    fallback: { dark: false },
    storage,
  })

  entries.add({ title: 'first' })
  entries.update('id-1', { title: 'renamed' })
  entries.remove('id-1')
  entries.replaceAll([{ id: 'z', title: 'kept' }])
  entries.clear()

  prefs.set({ dark: true })
  const dark = prefs.get()
  prefs.clear()
  return dark
}
```
