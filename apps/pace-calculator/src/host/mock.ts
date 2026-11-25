// Space-scoped persistence for the pace calculator.
// The last calculation is kept in the space's mock storage (localStorage)
// so the app works offline. State is rehydrated on load and saved on
// every calculation.

import { createMockValue } from '@lacuna/host-mock'

export type SolveFor = 'distance' | 'time' | 'pace'

export interface PaceRecord {
  solveFor: SolveFor
  distance: string
  time: string
  pace: string
  at: number
}

const KEY = 'lacuna.pace-calculator.last'

function isRecord(v: unknown): v is PaceRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    (r.solveFor === 'distance' || r.solveFor === 'time' || r.solveFor === 'pace') &&
    typeof r.distance === 'string' &&
    typeof r.time === 'string' &&
    typeof r.pace === 'string' &&
    typeof r.at === 'number'
  )
}

const store = createMockValue<PaceRecord | null>({ key: KEY, fallback: null, validate: isRecord })

export function loadLast(): PaceRecord | null {
  return store.get()
}

export function saveLast(record: PaceRecord | null): void {
  store.set(record)
}
