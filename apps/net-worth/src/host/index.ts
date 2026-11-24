// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Persistence for Net Worth Tracker: entries live behind a host facade so the
// app component never touches localStorage directly.

import { useCollection } from '@lacuna/use-collection';

export type EntryKind = 'asset' | 'liability';

export type EntryCategory = string;

export interface EntryData {
  name: string;
  kind: EntryKind;
  category: EntryCategory;
  /** Value in major currency units, always positive. */
  value: number;
}

export const STORAGE_KEY = 'net-worth-entries';

export function useEntries() {
  return useCollection<EntryData>({ storageKey: STORAGE_KEY });
}

export function entryValue(data: EntryData): number {
  return data.kind === 'asset' ? data.value : -data.value;
}

export function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface CsvRow {
  name: string;
  type: string;
  category: string;
  value: number;
}

export function toCsv(rows: Array<CsvRow>): string {
  const esc = (field: string) =>
    /[",\n]/.test(field) ? `"${field.replace(/"/g, '""')}"` : field;
  const lines = rows.map((r) =>
    [r.name, r.type, r.category, String(r.value)]
      .map(esc)
      .join(','),
  );
  return ['Name,Type,Category,Value', ...lines].join('\n');
}
