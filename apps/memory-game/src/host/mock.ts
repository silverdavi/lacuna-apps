export interface GameState {
  symbols: string[]
  faceUp: number[]
  locked: number[]
  score: number
  best: number
}

export type Storage = {
  load(): GameState | null
  save(state: GameState): void
  clear(): void
}

const KEY = 'lacuna.memory-game.state'

function empty(): GameState {
  return { symbols: [], faceUp: [], locked: [], score: 0, best: 0 }
}

function read(): GameState | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<GameState>
    if (!Array.isArray(parsed.symbols)) return null
    return {
      symbols: parsed.symbols,
      faceUp: Array.isArray(parsed.faceUp) ? parsed.faceUp : [],
      locked: Array.isArray(parsed.locked) ? parsed.locked : [],
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      best: typeof parsed.best === 'number' ? parsed.best : 0,
    }
  } catch {
    return null
  }
}

export const localStorageMock: Storage = {
  load: read,
  save(state: GameState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; the game still runs for the session
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // storage unavailable
    }
  },
}

export function freshState(): GameState {
  return empty()
}
