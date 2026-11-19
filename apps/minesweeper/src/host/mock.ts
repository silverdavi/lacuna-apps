export type Status = 'idle' | 'play' | 'won' | 'lost'

export interface CellFlat {
  mine: boolean
  revealed: boolean
  flagged: boolean
  exploded: boolean
  adj: number
}

export interface Level {
  rows: number
  cols: number
  mines: number
  cells: CellFlat[]
  mineGenerated: boolean
  revealedCount: number
  status: Status
}

export interface GameState {
  level: Level
  elapsedMs: number
  status: Status
}

const ROWS = 9
const COLS = 9
const MINES = 10

export const DEFAULT_COLS = COLS
export const DEFAULT_ROWS = ROWS
export const DEFAULT_MINES = MINES

const GAME_KEY = 'lacuna.minesweeper.game'
const BEST_KEY = 'lacuna.minesweeper.best'

export function freshLevel(): Level {
  return {
    rows: ROWS,
    cols: COLS,
    mines: MINES,
    cells: Array.from({ length: ROWS * COLS }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      exploded: false,
      adj: 0,
    })),
    mineGenerated: false,
    revealedCount: 0,
    status: 'idle',
  }
}

function loadBest(): number {
  try {
    const raw = window.localStorage.getItem(BEST_KEY)
    const value = raw ? Number(raw) : 0
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0
  } catch {
    return 0
  }
}

export const store = {
  loadGame(): GameState {
    try {
      const raw = window.localStorage.getItem(GAME_KEY)
      if (!raw) return { level: freshLevel(), elapsedMs: 0, status: 'idle' }
      const parsed = JSON.parse(raw) as GameState
      if (
        !parsed?.level ||
        !Array.isArray(parsed.level.cells) ||
        !['idle', 'play', 'won', 'lost'].includes(parsed.status)
      ) {
        return { level: freshLevel(), elapsedMs: 0, status: 'idle' }
      }
      return parsed
    } catch {
      return { level: freshLevel(), elapsedMs: 0, status: 'idle' }
    }
  },
  saveGame(state: GameState) {
    try {
      window.localStorage.setItem(GAME_KEY, JSON.stringify(state))
    } catch {
      // storage unavailable: the game still works in-memory
    }
  },
  loadBest(): number {
    return loadBest()
  },
  saveBest(bestMs: number) {
    try {
      const value = Math.max(0, Math.floor(bestMs))
      const current = loadBest()
      if (current === 0 || value < current) {
        window.localStorage.setItem(BEST_KEY, String(value))
      }
    } catch {
      // storage unavailable: best time is not persisted
    }
  },
}
