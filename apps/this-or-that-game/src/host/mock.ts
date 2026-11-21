import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.this-or-that-game.v1'

export type Answer = {
  questionId: string
  prompt: string
  picked: string
  points: number
}

export type GameState = {
  answers: Answer[]
  score: number
  best: number
}

const empty: GameState = { answers: [], score: 0, best: 0 }

const fresh = (): GameState => ({ answers: [], score: 0, best: 0 })

const isValid = (v: unknown): v is GameState => {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (!Array.isArray(s.answers)) return false
  for (const a of s.answers) {
    const r = a as Record<string, unknown> | undefined
    if (!r || typeof r.questionId !== 'string' || typeof r.prompt !== 'string' || typeof r.picked !== 'string' || typeof r.points !== 'number') return false
  }
  if (typeof s.score !== 'number') return false
  if (typeof s.best !== 'number') return false
  return true
}

const store = createMockValue<GameState>({
  key: KEY,
  fallback: fresh(),
  validate: isValid,
})

export const mockHost = {
  loadGame(): GameState {
    const state = store.get()
    return { ...state, answers: [...state.answers] }
  },

  saveGame(state: GameState) {
    store.set(state)
  },

  clear() {
    store.clear()
  },
}
