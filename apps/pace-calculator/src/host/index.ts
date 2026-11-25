// Mock space API for the pace calculator.
// The last calculation is persisted via the host-mock utility; every host
// call for this app goes through this adapter. A real host API would take
// the same shape, so swapping it here is the only change needed.

import {
  loadLast,
  saveLast,
  type PaceRecord,
  type SolveFor,
} from './mock'

export const spaceId = 'mock-pace-calculator'

export const host = {
  read(): PaceRecord | null {
    return loadLast()
  },

  write(record: PaceRecord | null): PaceRecord | null {
    saveLast(record)
    return record
  },

  clear(): PaceRecord | null {
    return host.write(null)
  },
}

export type { PaceRecord, SolveFor }
