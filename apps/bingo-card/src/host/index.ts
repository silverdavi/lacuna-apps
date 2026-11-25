// Mock space API. Lacuna spaces are the unit of storage; the mock keeps the
// bingo app's saved cards in localStorage so the whole app runs offline.
// Every host call for this app goes through this adapter; a real host API
// takes the same shape, so swapping it here is the only change needed.

import { cardStore, type SavedCard } from './mock'

export type { SavedCard } from './mock'

export const host = {
  listCards(): SavedCard[] {
    return cardStore.list()
  },

  addCard(record: Omit<SavedCard, 'id'> & { id?: string }): SavedCard {
    return cardStore.add(record)
  },

  removeCard(id: string): boolean {
    return cardStore.remove(id)
  },
}
