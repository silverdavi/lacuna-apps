import { createMockRecordStore } from '@lacuna/host-mock'

export interface HistoryRecord {
  id: string
  value: string
  version: 'v1' | 'v4'
}

export interface Host {
  listHistory(): HistoryRecord[]
  addHistory(record: Omit<HistoryRecord, 'id'>): HistoryRecord
  removeHistory(id: string): boolean
  clearHistory(): void
}

const KEY = 'lacuna.uuid-generator.history'

const store = createMockRecordStore<HistoryRecord>({
  key: KEY,
  idPrefix: 'uuid',
})

export const mockHost: Host = {
  listHistory() {
    return store.list()
  },
  addHistory(record) {
    return store.add(record)
  },
  removeHistory(id) {
    return store.remove(id)
  },
  clearHistory() {
    store.clear()
  },
}
