const KEY = 'lacuna.drum-machine.pattern.v1'

export const STEPS = 16

export type PatternState = {
  steps: boolean[]
  tempo: number
}

const DEFAULT_TEMPO = 120

function fresh(): PatternState {
  return { steps: Array.from({ length: STEPS }, () => false), tempo: DEFAULT_TEMPO }
}

export const mockHost = {
  loadPattern(): PatternState {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return fresh()
      const parsed = JSON.parse(raw) as Partial<PatternState>
      const steps = Array.from({ length: STEPS }, (_, i) =>
        Array.isArray(parsed.steps) ? Boolean(parsed.steps[i]) : false,
      )
      const tempo = Number(parsed.tempo)
      return {
        steps,
        tempo: Number.isFinite(tempo) && tempo >= 40 && tempo <= 240 ? Math.round(tempo) : DEFAULT_TEMPO,
      }
    } catch {
      return fresh()
    }
  },

  savePattern(state: PatternState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage is unavailable; the pattern stays in memory
    }
  },

  clear() {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // storage is unavailable
    }
  },
}
