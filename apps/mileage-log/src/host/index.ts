// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { store, validateEntry, type EntryInput, type EntryErrors, type MileageEntry } from './mock'

export type { MileageEntry, EntryInput, EntryErrors }

export function loadEntries(): MileageEntry[] {
  return store.list()
}

export function addEntry(input: EntryInput): { entry: MileageEntry; error: string | null } {
  const current = store.list()
  if (current.length > 0) {
    const last = current.reduce((a, b) => (b.odometer > a.odometer ? b : a))
    if (input.odometer <= last.odometer) {
      return { entry: null as unknown as MileageEntry, error: `Odometer must be above the last reading of ${last.odometer.toLocaleString('en-US')}` }
    }
  }
  const entry: MileageEntry = { id: crypto.randomUUID(), ...input }
  const saved = store.add(entry)
  return { entry: saved, error: null }
}

export function deleteEntry(id: string) {
  store.remove(id)
}

export function saveAll(entries: MileageEntry[]) {
  store.replaceAll(entries)
}

export { validateEntry }
