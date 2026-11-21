// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// @lacuna/query-spec 0.1.0: snapshot of lacuna-components querySpec at 9c7f3ab by sync-toolbox-components.py; a change gets a new version.
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

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  const sa = String(a);
  const sb = String(b);
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export function sortRecords<T extends Record<string, unknown>>(
  records: T[],
  keys: SortKey<T>[]
): T[] {
  const sorted = [...records];
  sorted.sort((a, b) => {
    for (const key of keys) {
      const dir = key.direction === 'desc' ? -1 : 1;
      const result = compareValues(a[key.field], b[key.field]) * dir;
      if (result !== 0) return result;
    }
    return 0;
  });
  return sorted;
}

export function filterRecords<T extends Record<string, unknown>>(
  records: T[],
  predicate: FilterPredicate<T>
): T[] {
  return records.filter(predicate);
}

export function groupRecords<T extends Record<string, unknown>, K extends string>(
  records: T[],
  key: GroupKey<T>
): GroupResult<T, K>[] {
  const map = new Map<string, T[]>();
  for (const record of records) {
    const k = String(record[key.field]);
    const existing = map.get(k);
    if (existing) {
      existing.push(record);
    } else {
      map.set(k, [record]);
    }
  }
  const results: GroupResult<T, K>[] = [];
  for (const [k, items] of map) {
    results.push({ key: k as K, items });
  }
  return results;
}
