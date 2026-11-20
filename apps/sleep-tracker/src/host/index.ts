// Space-scoped persistence for the sleep tracker.
// The app keeps every entry in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.

export const QUALITIES = ['Poor', 'Fair', 'Good', 'Great'] as const
export type Quality = (typeof QUALITIES)[number]

export type SleepEntry = {
  id: string
  date: string // YYYY-MM-DD
  minutes: number // total minutes slept
  quality: Quality
  createdAt: number
}

export type SleepState = {
  entries: SleepEntry[]
}

export const emptyState = (): SleepState => ({ entries: [] })

const KEY = 'lacuna.sleep-tracker.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `s-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function parseQuality(value: unknown): Quality | null {
  return QUALITIES.includes(value as Quality) ? (value as Quality) : null
}

export function loadState(): SleepState {
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
          typeof (e as SleepEntry).date === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test((e as SleepEntry).date) &&
          Number.isFinite((e as SleepEntry).minutes) &&
          (e as SleepEntry).minutes > 0 &&
          parseQuality((e as SleepEntry).quality) !== null,
      )
      .map((e: SleepEntry) => ({
        id: typeof e.id === 'string' && e.id ? e.id : makeId(),
        date: e.date,
        minutes: Math.round(e.minutes),
        quality: parseQuality(e.quality) as Quality,
        createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
      }))
    return { entries }
  } catch {
    return emptyState()
  }
}

export function saveState(state: SleepState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // storage may be unavailable (private mode, quota); the app keeps working in memory
  }
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${`${m}`.padStart(2, '0')}m`
}
