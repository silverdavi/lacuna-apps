import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.rock-paper-scissors.v1'

export type Outcome = 'Win' | 'Lose' | 'Draw'

export type Round = {
  n: number
  you: string
  computer: string
  outcome: Outcome
}

export type PersistedState = {
  score: number
  best: number
  rounds: Round[]
}

const fresh = (): PersistedState => ({ score: 0, best: 0, rounds: [] })

const isValid = (v: unknown): v is PersistedState => {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (typeof s.score !== 'number' || typeof s.best !== 'number') return false
  if (s.rounds !== undefined) {
    if (!Array.isArray(s.rounds)) return false
    for (const r of s.rounds) {
      const rr = r as Record<string, unknown> | undefined
      if (!rr || typeof rr.n !== 'number' || typeof rr.you !== 'string' || typeof rr.computer !== 'string') return false
      if (rr.outcome !== 'Win' && rr.outcome !== 'Lose' && rr.outcome !== 'Draw') return false
    }
  }
  return true
}

const store = createMockValue<PersistedState>({
  key: KEY,
  fallback: fresh(),
  validate: isValid,
})

export const mockHost = {
  load(): PersistedState {
    const s = store.get()
    return { score: s.score, best: s.best, rounds: s.rounds ?? [] }
  },

  save(state: PersistedState) {
    store.set(state)
  },
}
