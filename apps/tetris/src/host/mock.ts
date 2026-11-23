import { createMockValue } from '@lacuna/host-mock'

export interface GameState {
  score: number
  best: number
}

const KEY = 'lacuna.tetris.game-state.v1'

const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

const value = createMockValue<GameState>({
  key: KEY,
  fallback: { score: 0, best: 0 },
  validate: (v: unknown): v is GameState =>
    typeof v === 'object' &&
    v !== null &&
    isFiniteNumber((v as GameState).score) &&
    isFiniteNumber((v as GameState).best),
})

export const store = {
  load(): GameState {
    return value.get()
  },
  saveBest(best: number) {
    value.set({ ...value.get(), best })
  },
  reset() {
    value.set({ ...value.get(), score: 0 })
  },
}
