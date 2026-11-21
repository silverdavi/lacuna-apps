import { createMockValue } from '@lacuna/host-mock'

export interface GameState {
  symbols: string[]
  faceUp: number[]
  locked: number[]
  score: number
  best: number
}

const KEY = 'lacuna.memory-game.state'

function empty(): GameState {
  return { symbols: [], faceUp: [], locked: [], score: 0, best: 0 }
}

function isValid(v: unknown): v is GameState {
  const o = v as Record<string, unknown> | null
  if (!o || typeof o !== 'object') return false
  return (
    Array.isArray(o.symbols) &&
    Array.isArray(o.faceUp) &&
    Array.isArray(o.locked) &&
    typeof o.score === 'number' &&
    typeof o.best === 'number'
  )
}

const store = createMockValue<GameState>({
  key: KEY,
  fallback: empty(),
  validate: isValid,
})

export const storage = {
  load(): GameState {
    return store.get()
  },
  save(state: GameState): void {
    store.set(state)
  },
  clear(): void {
    store.clear()
  },
}

export function freshState(): GameState {
  return empty()
}
