import { createMockValue } from '@lacuna/host-mock'

export type TrackId = 'bass' | 'snare' | 'hihat'
export type Pattern = Record<TrackId, boolean[]>
export interface HistoryEntry {
  id: string
  name: string
  bpm: number
  savedAt: string
  steps: number
}

const PATTERNS_KEY = 'lacuna.drum-machine.patterns'
const TEMPO_KEY = 'lacuna.drum-machine.tempo'
const HISTORY_KEY = 'lacuna.drum-machine.history'
const STEPS = 16

function isTrackArray(value: unknown, id: TrackId): boolean {
  if (!Array.isArray(value)) return false
  if (value.length !== STEPS) return false
  if (!value.every((entry) => typeof entry === 'boolean')) return false
  return true
}

function isPattern(value: unknown): value is Pattern {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return isTrackArray(record.bass, 'bass') && isTrackArray(record.snare, 'snare') && isTrackArray(record.hihat, 'hihat')
}

function isBpm(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 20 && value <= 240
}

function isHistory(value: unknown): value is HistoryEntry[] {
  if (!Array.isArray(value)) return false
  if (value.length > 10) return false
  return value.every((entry) => {
    if (typeof entry !== 'object' || entry === null) return false
    const record = entry as Record<string, unknown>
    return (
      typeof record.id === 'string' &&
      typeof record.name === 'string' &&
      typeof record.bpm === 'number' &&
      typeof record.savedAt === 'string' &&
      typeof record.steps === 'number'
    )
  })
}

export const patternsStore = createMockValue<Pattern>({
  key: PATTERNS_KEY,
  fallback: {
    bass: Array(STEPS).fill(false),
    snare: Array(STEPS).fill(false),
    hihat: Array(STEPS).fill(false),
  },
  validate: isPattern,
})

export const tempoStore = createMockValue<number>({
  key: TEMPO_KEY,
  fallback: 120,
  validate: isBpm,
})

export const historyStore = createMockValue<HistoryEntry[]>({
  key: HISTORY_KEY,
  fallback: [],
  validate: isHistory,
})

