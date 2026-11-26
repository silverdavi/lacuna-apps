import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Conversion {
  id: string
  source: string
  target: string
  date: string
  time: string
  result: string
}

export interface Settings {
  source: string
  target: string
}

const HISTORY_KEY = 'lacuna.timezone-converter.history.v1'
const SETTINGS_KEY = 'lacuna.timezone-converter.settings.v1'

function isConversion(v: unknown): v is Conversion {
  const c = v as {
    id?: unknown
    source?: unknown
    target?: unknown
    date?: unknown
    time?: unknown
    result?: unknown
  }
  return (
    typeof c.id === 'string' &&
    typeof c.source === 'string' &&
    typeof c.target === 'string' &&
    typeof c.date === 'string' &&
    typeof c.time === 'string' &&
    typeof c.result === 'string'
  )
}

function isSettings(v: unknown): v is Settings {
  const s = v as { source?: unknown; target?: unknown }
  return typeof s.source === 'string' && typeof s.target === 'string'
}

export const store = createMockRecordStore<Conversion>({
  key: HISTORY_KEY,
  validate: isConversion,
})

export const settings = createMockValue<Settings>({
  key: SETTINGS_KEY,
  fallback: { source: 'UTC', target: 'New York' },
  validate: isSettings,
})
