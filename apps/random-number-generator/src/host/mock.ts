import { createMockValue } from '@lacuna/host-mock'

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
  /** Serialized settings the user saved with "Save settings". */
  preset?: string | null
}

const KEY = 'lacuna.random-number-generator.v1'

const empty = (): GenerationSession => ({
  settings: { min: '', max: '', count: '', dice: '' },
  last: null,
  history: [],
  preset: null,
})

function isGenerationSession(v: unknown): v is GenerationSession {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (typeof s.settings !== 'object' || s.settings === null) return false
  const settings = s.settings as Record<string, unknown>
  for (const k of ['min', 'max', 'count', 'dice']) {
    if (typeof settings[k] !== 'string') return false
  }
  const last = s.last
  if (last !== null && last !== undefined) {
    if (typeof last !== 'object' || last === null) return false
    if (typeof (last as Record<string, unknown>).result !== 'number') return false
    if (typeof (last as Record<string, unknown>).seed !== 'string') return false
  }
  if (s.history !== undefined && !Array.isArray(s.history)) return false
  if (s.preset !== undefined && s.preset !== null && typeof s.preset !== 'string') return false
  return true
}

const store = createMockValue<GenerationSession>({ key: KEY, fallback: empty(), validate: isGenerationSession })

export const mockGenerationStore = {
  async load(): Promise<GenerationSession> {
    return store.get()
  },
  async save(session: GenerationSession): Promise<void> {
    store.set(session)
  },
}
