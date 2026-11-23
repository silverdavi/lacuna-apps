// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Mock space API. Backed by @lacuna/host-mock so corrupt or missing storage
// degrades to an empty list instead of throwing.
import { createMockRecordStore } from '@lacuna/host-mock'
import { KEY, isActivity, type Activity } from './index'

export const spaceId = 'mock-baby-tracker'

const store = createMockRecordStore<Activity>({
  key: KEY,
  validate: isActivity,
})

function read(): Activity[] {
  return store.list()
}

export const host = {
  read,

  add(entry: Omit<Activity, 'id'> & { id?: string }): Activity {
    return store.add(entry)
  },

  remove(id: string): boolean {
    return store.remove(id)
  },

  clear(): void {
    store.clear()
  },

  reset(): void {
    store.clear()
  },
}

export { KEY }
export type { Activity }
