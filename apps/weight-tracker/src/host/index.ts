// Space-scoped persistence for the weight tracker.
// The app keeps every entry in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.

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

const KEY = 'lacuna.weight-tracker.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `w-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

export function loadState(): WeightState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.entries)) return emptyState()
    const entries = parsed.entries
      .filter(
        (e: unknown) =>
          e &&
          typeof e === 'object' &&
          typeof (e as WeightEntry).date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test((e as WeightEntry).date) &&
          Number.isFinite((e as WeightEntry).weight) &&
          (e as WeightEntry).weight > 0,
      )
      .map((e: WeightEntry) => ({
        id: typeof e.id === 'string' && e.id ? e.id : makeId(),
        date: e.date,
        weight: Math.round(e.weight * 10) / 10,
        createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
      }))
    return { entries }
  } catch {
    return emptyState()
  }
}

export function saveState(state: WeightState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage may be unavailable (private mode, quota); the app keeps working in memory
  }
}
