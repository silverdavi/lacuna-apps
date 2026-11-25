// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mock host boundary for the Net Worth Tracker dev environment: entry persistence
// is delegated to the @lacuna/use-collection facade backed by localStorage, so
// the component layer has one import path for both mock and real host.

export {
  STORAGE_KEY,
  entryValue,
  formatMoney,
  toCsv,
  useEntries,
} from './index';
export type { EntryCategory, EntryData, EntryKind } from './index';
