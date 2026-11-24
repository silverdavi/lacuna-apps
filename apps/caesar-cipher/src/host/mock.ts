import { createMockValue } from '@lacuna/host-mock'

export interface CipherSettings {
  cipher: string
  shift: number
  direction: string
}

export interface CipherHistoryItem {
  id: string
  text: string
  cipher: string
  shift: number
  direction: string
  output: string
  createdAt: number
}

export interface CipherRecord {
  settings: CipherSettings
  history: CipherHistoryItem[]
  text: string
}

const KEY = 'lacuna:caesar-cipher:v1'

export const DEFAULT_SETTINGS: CipherSettings = {
  cipher: 'Caesar',
  shift: 3,
  direction: 'forward',
}

export const DEFAULT_RECORD: CipherRecord = {
  settings: DEFAULT_SETTINGS,
  history: [],
  text: '',
}

export const recordStore = createMockValue<CipherRecord>({
  key: KEY,
  fallback: DEFAULT_RECORD,
  validate: (v: unknown): v is CipherRecord => {
    const obj = v as Record<string, unknown>
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'settings' in obj &&
      'history' in obj &&
      'text' in obj
    )
  },
})
