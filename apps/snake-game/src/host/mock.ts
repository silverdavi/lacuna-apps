import { createMockValue } from '@lacuna/host-mock'

export type GameState = { id: string; score: number; best: number }

const KEY = 'lacuna.snake-game.best'

const isValid = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0

const best = createMockValue<number>({ key: KEY, fallback: 0, validate: isValid })

export const store = {
  load() {
    return { id: 'game', score: 0, best: best.get() }
  },
  saveBest(score: number) {
    if (score > best.get()) best.set(score)
  },
  reset() {
    best.clear()
  },
}
