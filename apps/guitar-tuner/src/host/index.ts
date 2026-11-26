// Space-scoped persistence for the guitar tuner, backed by @lacuna/host-mock.
// The app keeps every tuning entry in the space's mock storage (localStorage),
// so it works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type TuningEntry = {
  id: string
  date: string
  string: string
  targetHz: number
  detectedHz: number
  centOffset: number
  createdAt: number
}

export type TuningState = {
  entries: TuningEntry[]
}

export const emptyState = (): TuningState => ({ entries: [] })

export const KEY = 'lacuna.guitar-tuner.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `t-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isTuningEntry(value: unknown): value is TuningEntry {
  const e = value as TuningEntry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.date === 'string' &&
    typeof e.string === 'string' &&
    Number.isFinite(e.targetHz) &&
    Number.isFinite(e.detectedHz) &&
    Number.isFinite(e.centOffset)
  )
}

const store = createMockRecordStore<TuningEntry>({
  key: KEY,
  idPrefix: 't-',
  validate: isTuningEntry,
})

export function loadState(): TuningState {
  const entries = store
    .list()
    .map((e) => ({
      id: e.id,
      date: e.date,
      string: e.string,
      targetHz: e.targetHz,
      detectedHz: e.detectedHz,
      centOffset: e.centOffset,
      createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
    }))
    .sort((a, b) => a.createdAt - b.createdAt)
  return { entries }
}

export function saveState(state: TuningState): void {
  store.replaceAll(state.entries)
}
