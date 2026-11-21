// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// calculator's last result in localStorage so the whole app runs offline.
// Every host call for this app goes through this adapter; a real host API
// takes the same shape, so swapping it here is the only change needed.

import { loadLast, saveLast, type BmiRecord, type Units } from './mock'

export const spaceId = 'mock-bmi-calculator'

export const host = {
  read(): BmiRecord | null {
    return loadLast()
  },

  write(record: BmiRecord | null): BmiRecord | null {
    saveLast(record)
    return record
  },

  saveLast(units: Units, height: string, weight: string, bmi: number): BmiRecord {
    const record: BmiRecord = { units, height, weight, bmi, at: Date.now() }
    host.write(record)
    return record
  },

  clear(): BmiRecord | null {
    return host.write(null)
  },
}

export type { BmiRecord, Units }
