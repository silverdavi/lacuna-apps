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

export const mockHost: Host = {
  loadSettings() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as Partial<Settings>
      return {
        length: typeof data.length === 'number' && Number.isFinite(data.length) ? data.length : DEFAULT_SETTINGS.length,
        lowercase: typeof data.lowercase === 'boolean' ? data.lowercase : DEFAULT_SETTINGS.lowercase,
        uppercase: typeof data.uppercase === 'boolean' ? data.uppercase : DEFAULT_SETTINGS.uppercase,
        digits: typeof data.digits === 'boolean' ? data.digits : DEFAULT_SETTINGS.digits,
        symbols: typeof data.symbols === 'boolean' ? data.symbols : DEFAULT_SETTINGS.symbols,
      }
    } catch {
      return null
    }
  },
  saveSettings(settings: Settings) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      // storage unavailable; settings stay in memory only
    }
  },
}
