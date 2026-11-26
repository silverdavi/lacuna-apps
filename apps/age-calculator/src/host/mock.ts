// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockValue, createMockRecordStore } from '@lacuna/host-mock'

export interface AgeState {
  /** `YYYY-MM-DD` birth date, empty when unset. */
  birth: string
  /** `YYYY-MM-DD` reference date, empty for "today". */
  reference: string
  calculated: boolean
}

export interface AgeRecord {
  id: string
  label: string
  birth: string
  reference: string
  result: string
}

const validate = (value: unknown): value is AgeState => {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Partial<AgeState>
  return (
    typeof v.birth === 'string' &&
    (v.birth === '' || /^\d{4}-\d{2}-\d{2}$/.test(v.birth)) &&
    typeof v.reference === 'string' &&
    (v.reference === '' || /^\d{4}-\d{2}-\d{2}$/.test(v.reference)) &&
    typeof v.calculated === 'boolean'
  )
}

function storageKey(): string {
  try {
    const el = document.getElementById('root')
    return el?.getAttribute('data-branch') ?? 'default'
  } catch {
    return 'default'
  }
}

export const STORAGE_KEY = `lacuna.age-calculator:${storageKey()}:state`
const HISTORY_KEY = `lacuna.age-calculator:${storageKey()}:history`

export function ageStore() {
  return createMockValue<AgeState>({
    key: STORAGE_KEY,
    fallback: { birth: '', reference: '', calculated: false },
    validate,
  })
}

const validateRecord = (value: unknown): value is AgeRecord => {
  if (typeof value !== 'object' || value === null) return false
  const r = value as Partial<AgeRecord>
  return typeof r.id === 'string' && typeof r.label === 'string' && typeof r.birth === 'string' && typeof r.reference === 'string' && typeof r.result === 'string'
}

export function ageHistoryStore() {
  return createMockRecordStore<AgeRecord>({
    key: HISTORY_KEY,
    validate: validateRecord,
    idPrefix: 'age-',
  })
}
