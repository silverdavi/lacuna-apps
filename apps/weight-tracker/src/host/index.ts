// Space-scoped persistence for the weight tracker, backed by @lacuna/host-mock.
// The app keeps every entry in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type WeightEntry = {
  id: string
  date: string // YYYY-MM-DD
  weight: number // kg
  createdAt: number
}

export type WeightState = {
  entries: WeightEntry[]
}

export const emptyState = (): WeightState => ({ entries: [] })

export const KEY = 'lacuna.weight-tracker.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `w-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isWeightEntry(value: unknown): value is WeightEntry {
  const e = value as WeightEntry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    Number.isFinite(e.weight) &&
    e.weight > 0
  )
}

const store = createMockRecordStore<WeightEntry>({
  key: KEY,
  idPrefix: 'w-',
  validate: isWeightEntry,
})

export function loadState(): WeightState {
  const entries = store
    .list()
    .map((e) => ({
      id: e.id,
      date: e.date,
      weight: Math.round(e.weight * 10) / 10,
      createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return { entries }
}

export function saveState(state: WeightState): void {
  store.replaceAll(state.entries)
}
