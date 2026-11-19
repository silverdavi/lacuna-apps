export interface GameState {
  id: string
  score: number
  best: number
}

const BEST_KEY = 'lacuna.snake-game.best'

function loadBest(): number {
  const raw = window.localStorage.getItem(BEST_KEY)
  const value = raw ? Number(raw) : 0
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
}

export const store = {
  load(): GameState {
    return { id: 'game', score: 0, best: loadBest() }
  },
  saveBest(best: number) {
    window.localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(best))))
  },
  reset() {
    // The run score is in-memory only; nothing to clear on the host.
  },
}
