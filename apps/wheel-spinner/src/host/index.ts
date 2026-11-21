// Space-scoped persistence for the wheel spinner, backed by @lacuna/host-mock.
// The app keeps its entries and spin log in the space's mock storage (localStorage),
// so it works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type WheelEntry = {
  id: string
  name: string
  createdAt: number
}

export type SpinRecord = {
  id: string
  winner: string
  at: number
}

export type WheelState = {
  entries: WheelEntry[]
  spins: SpinRecord[]
}

export const emptyState = (): WheelState => ({ entries: [], spins: [] })

export const ENTRIES_KEY = 'lacuna.wheel-spinner.entries'
export const SPINS_KEY = 'lacuna.wheel-spinner.spins'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `w-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isWheelEntry(value: unknown): value is WheelEntry {
  const e = value as WheelEntry
  return e != null && typeof e === 'object' && typeof e.name === 'string' && e.name.length > 0
}

function isSpinRecord(value: unknown): value is SpinRecord {
  const s = value as SpinRecord
  return (
    s != null &&
    typeof s === 'object' &&
    typeof s.winner === 'string' &&
    s.winner.length > 0 &&
    Number.isFinite(s.at)
  )
}

const entriesStore = createMockRecordStore<WheelEntry>({
  key: ENTRIES_KEY,
  idPrefix: 'w-',
  validate: isWheelEntry,
})

const spinsStore = createMockRecordStore<SpinRecord>({
  key: SPINS_KEY,
  idPrefix: 's-',
  validate: isSpinRecord,
})

export function loadState(): WheelState {
  const entries = entriesStore.list()
  const spins = spinsStore.list().sort((a, b) => a.at - b.at || a.id.localeCompare(b.id))
  return { entries, spins }
}

export function saveState(state: WheelState): void {
  entriesStore.replaceAll(state.entries)
  spinsStore.replaceAll(state.spins)
}
