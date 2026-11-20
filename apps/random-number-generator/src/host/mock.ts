const KEY = 'lacuna.random-number-generator.v1'

export interface GenerationSettings {
  min: string
  max: string
  count: string
  dice: string
}

export interface RollRow {
  value: number
  running?: number
}

export interface HistoryEntry {
  id?: string
  seed: string
  label: string
  rows: RollRow[]
}

export interface LastGeneration {
  result: number
  seed: string
}

export interface GenerationSession {
  settings: GenerationSettings
  last: LastGeneration | null
  history: HistoryEntry[]
}

const empty = (): GenerationSession => ({
  settings: { min: '', max: '', count: '', dice: '' },
  last: null,
  history: [],
})

export const mockGenerationStore = {
  async load(): Promise<GenerationSession> {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return empty()
      const parsed = JSON.parse(raw) as GenerationSession
      if (typeof parsed !== 'object' || parsed === null || typeof parsed.settings !== 'object') return empty()
      return {
        settings: {
          min: typeof parsed.settings.min === 'string' ? parsed.settings.min : '',
          max: typeof parsed.settings.max === 'string' ? parsed.settings.max : '',
          count: typeof parsed.settings.count === 'string' ? parsed.settings.count : '',
          dice: typeof parsed.settings.dice === 'string' ? parsed.settings.dice : '',
        },
        last:
          parsed.last && typeof parsed.last.result === 'number' && typeof parsed.last.seed === 'string'
            ? parsed.last
            : null,
        history: Array.isArray(parsed.history) ? parsed.history : [],
      }
    } catch {
      return empty()
    }
  },
  async save(session: GenerationSession): Promise<void> {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(session))
    } catch {
      return
    }
  },
}
