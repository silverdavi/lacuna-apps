import { createMockValue } from '@lacuna/host-mock'

export interface GameState {
  seed: number
  moves: number
  best: number | null
}

export interface HistoryEntry {
  seed: number
  moves: number
}

const KEY = 'lacuna.lights-out.state'

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.seed === 'number' &&
    Number.isInteger(v.seed) &&
    v.seed >= 0 &&
    v.seed <= 99999 &&
    typeof v.moves === 'number' &&
    Number.isInteger(v.moves) &&
    v.moves >= 0 &&
    (v.best === null || (typeof v.best === 'number' && Number.isInteger(v.best) && v.best > 0))
  )
}

const state = createMockValue<GameState>({
  key: KEY,
  fallback: { seed: 42, moves: 0, best: null },
  validate: isGameState,
})

export function loadState(): GameState {
  return state.get()
}

export function saveState(next: GameState): void {
  state.set(next)
}
