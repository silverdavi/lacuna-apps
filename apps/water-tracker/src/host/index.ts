// Space-scoped persistence for the water tracker, backed by @lacuna/host-mock.
// The app keeps every intake entry in the space's mock storage (localStorage),
// so it works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export type WaterEntry = {
  id: string
  date: string // YYYY-MM-DD
  amount: number // ml
  createdAt: number
}

export type WaterState = {
  entries: WaterEntry[]
  goal: number // daily goal in ml
}

export const DEFAULT_GOAL = 2000

export const emptyState = (): WaterState => ({ entries: [], goal: DEFAULT_GOAL })

export const KEY = 'lacuna.water-tracker.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `wt-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isWaterEntry(value: unknown): value is WaterEntry {
  const e = value as WaterEntry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    Number.isFinite(e.amount) &&
    e.amount > 0
  )
}

const store = createMockRecordStore<WaterEntry>({
  key: KEY,
  idPrefix: 'wt-',
  validate: isWaterEntry,
})

const SETTINGS_KEY = `${KEY}.settings`

type Settings = {
  goal: number
}

function loadSettings(): Settings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { goal: DEFAULT_GOAL }
    const parsed = JSON.parse(raw) as Partial<Settings>
    const goal =
      typeof parsed.goal === 'number' && Number.isFinite(parsed.goal) && parsed.goal > 0 ? Math.round(parsed.goal) : DEFAULT_GOAL
    return { goal }
  } catch {
    return { goal: DEFAULT_GOAL }
  }
}

export function loadState(): WaterState {
  const entries = store
    .list()
    .map((e) => ({
      id: e.id,
      date: e.date,
      amount: Math.round(e.amount),
      createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return { entries, goal: loadSettings().goal }
}

export function saveState(state: WaterState): void {
  store.replaceAll(state.entries)
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify({ goal: state.goal }))
  } catch {
    // ignore
  }
}
