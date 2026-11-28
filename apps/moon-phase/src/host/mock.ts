const KEY = 'lacuna.moon-phase.settings'

export type Settings = { south: boolean; h12: boolean }

const localH12 = (): boolean => {
  try {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions().hour12 === true
  } catch {
    return false
  }
}

export const mockStore = {
  readSettings(): Settings {
    const fallback: Settings = { south: false, h12: localH12() }
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return fallback
      const v = JSON.parse(raw) as Partial<Settings>
      return { south: v.south === true, h12: typeof v.h12 === 'boolean' ? v.h12 : fallback.h12 }
    } catch {
      return fallback
    }
  },
  writeSettings(s: Settings) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      // storage unavailable; settings live for this session only
    }
  },
}
