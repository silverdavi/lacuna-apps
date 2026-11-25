// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { store, type MileageEntry } from './mock'

export type { MileageEntry }

export function listEntries(): MileageEntry[] {
  return store.list()
}

export function addEntry(input: Omit<MileageEntry, 'id'>): MileageEntry {
  return store.add(input)
}

export function deleteEntry(id: string) {
  store.remove(id)
}
