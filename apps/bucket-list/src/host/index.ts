import { useCollection } from '@lacuna/use-collection'
import type { Entry } from './mock'

export type { Entry, Step } from './mock'
export { ENTRY_STORAGE_KEY, isEntry } from './mock'

export function useBucketList() {
  return useCollection<Entry>({
    storageKey: 'lacuna.bucket-list.entries',
    initialItems: [],
  })
}
