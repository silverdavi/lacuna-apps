// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// saved subnets in localStorage so the whole app runs offline. Every host call
// for this app goes through this adapter; a real host API takes the same shape,
// so swapping it here is the only change needed.

import { addSaved, loadSaved, removeSaved, type SavedSubnet } from './mock'

export const spaceId = 'mock-subnet-calculator'

export const host = {
  list(): SavedSubnet[] {
    return loadSaved()
  },

  add(ip: string, prefix: number): SavedSubnet[] {
    return addSaved(ip, prefix)
  },

  remove(id: string): SavedSubnet[] {
    return removeSaved(id)
  },
}

export type { SavedSubnet }
