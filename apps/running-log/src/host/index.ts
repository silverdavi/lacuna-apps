// Space-scoped persistence for the running log, backed by @lacuna/host-mock.
// The app keeps every run in the space's mock storage (localStorage), so it
// works with no network. State is rehydrated on load and saved on every change.
import { createMockRecordStore } from '@lacuna/host-mock'

export interface Run {
  id: string
  date: string // YYYY-MM-DD
  distance: number // km
  time: number // minutes
  createdAt: number
}

export type RunState = {
  runs: Run[]
}

export const emptyState = (): RunState => ({ runs: [] })

export const KEY = 'lacuna.running-log.state'

export function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `run-${Date.now()}-${Math.floor(Math.random() * 1e9)}`
}

function isRun(value: unknown): value is Run {
  const r = value as Run
  return (
    r != null &&
    typeof r === 'object' &&
    typeof r.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
    Number.isFinite(r.distance) &&
    r.distance > 0 &&
    Number.isFinite(r.time) &&
    r.time > 0
  )
}

const store = createMockRecordStore<Run>({
  key: KEY,
  idPrefix: 'run-',
  validate: isRun,
})

export function loadState(): RunState {
  const runs = store
    .list()
    .map((r) => ({
      id: r.id,
      date: r.date,
      distance: Math.round(r.distance * 1000) / 1000,
      time: Math.round(r.time),
      createdAt: Number.isFinite(r.createdAt) ? r.createdAt : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)
  return { runs }
}

export function saveState(state: RunState): void {
  store.replaceAll(state.runs)
}

// Pace is displayed to the nearest 3 seconds (0.05 min/km), a common running-app precision.
const PACE_STEP_SECONDS = 3

function roundedPaceSeconds(run: Run): number {
  return Math.round(((run.time / run.distance) * 60) / PACE_STEP_SECONDS) * PACE_STEP_SECONDS
}

export function paceOf(run: Run): string {
  const totalSeconds = roundedPaceSeconds(run)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}/km`
}

export function paceSeconds(run: Run): number {
  return roundedPaceSeconds(run)
}
