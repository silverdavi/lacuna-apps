import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Settings {
  version: 'v1' | 'v4'
  batch: number
  upper: boolean
}

export const DEFAULT_SETTINGS: Settings = { version: 'v4', batch: 1, upper: false }

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
  loadSettings(): Settings
  saveSettings(settings: Settings): void
}

const KEY = 'lacuna.uuid-generator.history'

const store = createMockRecordStore<HistoryRecord>({
  key: KEY,
  idPrefix: 'uuid',
})

function isSettings(value: unknown): value is Settings {
  const s = value as Settings
  return s != null && (s.version === 'v1' || s.version === 'v4') && Number.isInteger(s.batch) && s.upper === (s.upper === true)
}

const settingsStore = createMockValue<Settings>({
  key: 'lacuna.uuid-generator.settings',
  fallback: DEFAULT_SETTINGS,
  validate: isSettings,
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
  loadSettings() {
    return settingsStore.get()
  },
  saveSettings(settings) {
    settingsStore.set(settings)
  },
}
