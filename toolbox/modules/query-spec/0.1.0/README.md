<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components querySpec at 9c7f3ab. -->

> `@lacuna/query-spec` `0.1.0`. To use it in an app: add `"@lacuna/query-spec": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/query-spec": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/query-spec'`.

# querySpec

Pure functions for multi-key sorting, predicate-based filtering, and group-by aggregation over arrays of record objects, enabling composable data pipelines for table and list views.

## Signature

```ts
export type SortDirection = 'asc' | 'desc';

export interface SortKey<T> {
  field: keyof T & string;
  direction?: SortDirection;
}

export type FilterPredicate<T> = (record: T) => boolean;

export interface GroupKey<T> {
  field: keyof T & string;
}

export interface GroupResult<T, K extends string> {
  key: K;
  items: T[];
}

export function sortRecords<T extends Record<string, unknown>>(
  records: T[],
  keys: SortKey<T>[]
): T[];

export function filterRecords<T extends Record<string, unknown>>(
  records: T[],
  predicate: FilterPredicate<T>
): T[];

export function groupRecords<T extends Record<string, unknown>, K extends string>(
  records: T[],
  key: GroupKey<T>
): GroupResult<T, K>[];
```

## Usage

```tsx
import { sortRecords, filterRecords, groupRecords } from '@lacuna/query-spec';

const rows = [
  { name: 'b', age: 2 },
  { name: 'a', age: 1 },
];

const sorted = sortRecords(rows, [{ field: 'name' }]);
const filtered = filterRecords(rows, (r) => r.age > 1);
const grouped = groupRecords(rows, { field: 'name' });
```
