import { createMockRecordStore } from '@lacuna/host-mock'

export type HistoryEntry = {
  id: string
  mode: 'Encode' | 'Decode'
  message: string
  key: string
  result: string
  createdAt: number
}

const KEY = 'lacuna.vigenere-cipher.history'

function isHistoryEntry(value: unknown): value is HistoryEntry {
  const v = value as Partial<HistoryEntry> | null
  return (
    !!v &&
    typeof v.id === 'string' &&
    (v.mode === 'Encode' || v.mode === 'Decode') &&
    typeof v.message === 'string' &&
    typeof v.key === 'string' &&
    typeof v.result === 'string' &&
    typeof v.createdAt === 'number'
  )
}

const store = createMockRecordStore<HistoryEntry>({
  key: KEY,
  idPrefix: 'cipher-',
  validate: isHistoryEntry,
})

export function listHistory(): HistoryEntry[] {
  return store.list()
}

export function addHistory(entry: Omit<HistoryEntry, 'id' | 'createdAt'>): HistoryEntry[] {
  store.add({ ...entry, createdAt: Date.now() })
  const all = store.list()
  if (all.length > 20) {
    store.replaceAll(all.slice(-20))
  }
  return store.list()
}

export function removeHistory(id: string): HistoryEntry[] {
  store.remove(id)
  return store.list()
}
