// Space-scoped persistence for the BMI calculator.
// The last calculation and the history of calculations are kept in the
// space's mock storage (localStorage) so the app works offline. State is
// rehydrated on load and saved on every calculation.

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

const HISTORY_KEY = 'lacuna.bmi-calculator.history'
const HISTORY_LIMIT = 8

function isHistory(v: unknown): v is BmiRecord[] {
  return Array.isArray(v) && v.every(isRecord)
}

const historyStore = createMockValue<BmiRecord[]>({ key: HISTORY_KEY, fallback: [], validate: isHistory })

export function loadHistory(): BmiRecord[] {
  return historyStore.get()
}

export function pushHistory(record: BmiRecord): BmiRecord[] {
  const next = [record, ...historyStore.get()].slice(0, HISTORY_LIMIT)
  historyStore.set(next)
  return next
}

export function removeHistory(at: number): BmiRecord[] {
  const next = historyStore.get().filter((r) => r.at !== at)
  historyStore.set(next)
  return next
}

export function clearHistory(): BmiRecord[] {
  historyStore.set([])
  return []
}
