// Space-scoped persistence for the BMI calculator.
// The last calculation is kept in the space's mock storage (localStorage) so
// the app works offline. State is rehydrated on load and saved on every
// calculation.

import { createMockValue } from '@lacuna/host-mock'

export type Units = 'metric' | 'imperial'

export interface BmiRecord {
  units: Units
  height: string
  weight: string
  bmi: number
  at: number
}

const KEY = 'lacuna.bmi-calculator.last'

export const EMPTY_RECORD: BmiRecord = { units: 'metric', height: '', weight: '', bmi: 0, at: 0 }

function isRecord(v: unknown): v is BmiRecord {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    (r.units === 'metric' || r.units === 'imperial') &&
    typeof r.height === 'string' &&
    typeof r.weight === 'string' &&
    typeof r.bmi === 'number' &&
    Number.isFinite(r.bmi) &&
    typeof r.at === 'number'
  )
}

const store = createMockValue<BmiRecord | null>({ key: KEY, fallback: null, validate: isRecord })

export function loadLast(): BmiRecord | null {
  const record = store.get()
  if (!record || record.height === '' || record.weight === '' || !Number.isFinite(record.bmi)) return null
  return record
}

export function saveLast(record: BmiRecord | null): void {
  store.set(record)
}
