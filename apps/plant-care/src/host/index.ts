// Space-scoped persistence for plant care, backed by the host-mock storage.
// The app keeps every plant and watering in the space's storage (localStorage),
// so it works with no network. State is rehydrated on load and saved on every change.
import '@lacuna/use-local-record'
import { createMockValue, type MockValue } from '@lacuna/host-mock'

export type Plant = {
  id: string
  name: string
  intervalDays: number
  addedAt: number
  lastWatered: string | null // YYYY-MM-DD
}

export type WaterLogEntry = {
  id: string
  plantId: string
  plantName: string
  date: string // YYYY-MM-DD
  wateredAt: number
}

export type PlantState = {
  plants: Plant[]
  log: WaterLogEntry[]
}

export const KEY = 'lacuna.plant-care.state'

export function emptyState(): PlantState {
  return { plants: [], log: [] }
}

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `p-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isPlant(v: unknown): v is Plant {
  const p = v as Plant
  return (
    p != null &&
    typeof p === 'object' &&
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    p.name.length > 0 &&
    Number.isFinite(p.intervalDays) &&
    p.intervalDays >= 1 &&
    (p.lastWatered === null || (typeof p.lastWatered === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.lastWatered)))
  )
}

function isLogEntry(v: unknown): v is WaterLogEntry {
  const e = v as WaterLogEntry
  return (
    e != null &&
    typeof e === 'object' &&
    typeof e.id === 'string' &&
    typeof e.plantId === 'string' &&
    typeof e.plantName === 'string' &&
    typeof e.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    Number.isFinite(e.wateredAt)
  )
}

function isState(v: unknown): v is PlantState {
  const s = v as PlantState
  return (
    s != null &&
    typeof s === 'object' &&
    Array.isArray(s.plants) &&
    s.plants.every(isPlant) &&
    Array.isArray(s.log) &&
    s.log.every(isLogEntry)
  )
}

export const stateStore: MockValue<PlantState> = createMockValue<PlantState>({
  key: KEY,
  fallback: emptyState(),
  validate: isState,
})

export function loadState(): PlantState {
  const s = stateStore.get()
  return {
    plants: [...s.plants],
    log: [...s.log].sort((a, b) => b.wateredAt - a.wateredAt),
  }
}

export function saveState(state: PlantState): void {
  stateStore.set(state)
}
