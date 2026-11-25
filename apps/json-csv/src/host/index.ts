// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { store, type HistoryEntry } from './mock'

export type { HistoryEntry }

export function listHistory(): HistoryEntry[] {
  return store.list()
}

export function addHistory(entry: Omit<HistoryEntry, 'id'>): HistoryEntry {
  return store.add(entry)
}

export function removeHistory(id: string): boolean {
  return store.remove(id)
}

export function clearHistory(): void {
  store.clear()
}
