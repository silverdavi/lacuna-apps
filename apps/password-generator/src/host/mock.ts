import { createMockValue } from '@lacuna/host-mock'

export interface Settings {
  length: number
  lowercase: boolean
  uppercase: boolean
  digits: boolean
  symbols: boolean
}

export interface Host {
  loadSettings(): Settings | null
  saveSettings(settings: Settings): void
}

const KEY = 'lacuna.password-generator.settings'

export const DEFAULT_SETTINGS: Settings = {
  length: 16,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
}

function isSettings(v: unknown): v is Settings {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  return (
    typeof s.length === 'number' &&
    Number.isFinite(s.length) &&
    typeof s.lowercase === 'boolean' &&
    typeof s.uppercase === 'boolean' &&
    typeof s.digits === 'boolean' &&
    typeof s.symbols === 'boolean'
  )
}

const store = createMockValue<Settings>({ key: KEY, fallback: DEFAULT_SETTINGS, validate: isSettings })

export const mockHost: Host = {
  loadSettings() {
    return store.get()
  },
  saveSettings(settings: Settings) {
    store.set(settings)
  },
}
