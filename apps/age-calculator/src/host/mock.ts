// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
// Local, localStorage-backed host for this app. No data leaves the browser.
import { createMockValue } from '@lacuna/host-mock'

export interface AgeState {
  /** `YYYY-MM-DD` birth date, empty when unset. */
  birth: string
  /** `YYYY-MM-DD` reference date, empty for "today". */
  reference: string
  calculated: boolean
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

export function ageStore() {
  return createMockValue<AgeState>({
    key: STORAGE_KEY,
    fallback: { birth: '', reference: '', calculated: false },
    validate,
  })
}
