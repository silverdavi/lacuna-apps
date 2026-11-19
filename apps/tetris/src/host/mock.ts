export interface GameState {
  id: string
  score: number
  best: number
}

const KEY = 'lacuna.tetris.game-state.v1'

function load(): GameState {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return { id: 'game', score: 0, best: 0 }
    const parsed = JSON.parse(raw) as Partial<GameState>
    return {
      id: typeof parsed.id === 'string' && parsed.id ? parsed.id : 'game',
      score: typeof parsed.score === 'number' && Number.isFinite(parsed.score) ? parsed.score : 0,
      best: typeof parsed.best === 'number' && Number.isFinite(parsed.best) ? parsed.best : 0,
    }
  } catch {
    return { id: 'game', score: 0, best: 0 }
  }
}

function save(state: GameState) {
  window.localStorage.setItem(KEY, JSON.stringify(state))
}

export const store = {
  load(): GameState {
    return load()
  },
  saveBest(best: number) {
    const state = load()
    save({ ...state, best })
  },
  reset() {
    const state = load()
    save({ ...state, score: 0 })
  },
}
