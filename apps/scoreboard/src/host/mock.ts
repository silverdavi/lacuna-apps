// Space-scoped persistence for Score Keeper, backed by @lacuna/host-mock.
// Entries live in the space's mock storage (localStorage) so the app works
// with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type Entry = {
  id: string
  name: string
  score: number
}

const KEY = 'lacuna.scoreboard.entries.v1'

function isEntry(v: unknown): v is Entry {
  const e = v as Entry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    typeof e.name === 'string' &&
    e.name.length > 0 &&
    typeof e.score === 'number' &&
    Number.isFinite(e.score)
  )
}

export const store = createMockRecordStore<Entry>({
  key: KEY,
  idPrefix: 'e-',
  validate: isEntry,
})

export function loadEntries(): Entry[] {
  return store
    .list()
    .map((e) => ({ id: e.id, name: e.name, score: e.score }))
}

export function saveEntries(entries: Entry[]): void {
  store.replaceAll(entries)
}
