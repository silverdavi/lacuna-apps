// Space-scoped persistence for the Symptom Tracker, backed by @lacuna/host-mock.
// Every entry lives in the space's mock storage (localStorage), so the app works
// with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type SymptomEntry = {
  id: string
  date: string // YYYY-MM-DD
  name: string
  severity: number // 1-5
  note?: string
  createdAt: number
}

export type SymptomState = {
  entries: SymptomEntry[]
}

export const emptyState = (): SymptomState => ({ entries: [] })

export const KEY = 'lacuna.symptom-tracker.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isSymptomEntry(value: unknown): value is SymptomEntry {
  const e = value as SymptomEntry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.name === 'string' &&
    e.name.trim().length > 0 &&
    Number.isFinite(e.severity) &&
    e.severity >= 1 &&
    e.severity <= 5
  )
}

const store = createMockRecordStore<SymptomEntry>({
  key: KEY,
  idPrefix: 's-',
  validate: isSymptomEntry,
})

export function loadState(): SymptomState {
  const entries = store
    .list()
    .map((e) => ({
      id: e.id,
      date: e.date,
      name: e.name,
      severity: Math.round(e.severity),
      note: typeof e.note === 'string' ? e.note : undefined,
      createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  return { entries }
}

export function saveState(state: SymptomState): void {
  store.replaceAll(state.entries)
}
