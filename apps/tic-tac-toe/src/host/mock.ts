import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.tic-tac-toe.v2'

export type Mark = 'X' | 'O'
export type Outcome = Mark | 'draw'

export type GameRecord = {
  id: string
  result: Outcome
  moves: number
  winner?: Mark
}

export type GameState = {
  board: (Mark | null)[]
  turn: Mark
  score: { x: number; o: number; draws: number }
  winner: Mark | 'draw' | null
  history: GameRecord[]
}

const empty: GameState = {
  board: [null, null, null, null, null, null, null, null, null],
  turn: 'X',
  score: { x: 0, o: 0, draws: 0 },
  winner: null,
  history: [],
}

const fresh = (): GameState => ({ ...empty, board: [...empty.board], score: { ...empty.score }, history: [] })

let recordSeq = 0

export function nextId(): string {
  recordSeq += 1
  return `g${Date.now().toString(36)}${recordSeq.toString(36)}`
}

const isValid = (v: unknown): v is GameState => {
  if (typeof v !== 'object' || v === null) return false
  const s = v as Record<string, unknown>
  if (!Array.isArray(s.board) || s.board.length !== 9) return false
  for (const cell of s.board) {
    if (cell !== null && cell !== 'X' && cell !== 'O') return false
  }
  if (s.turn !== 'X' && s.turn !== 'O') return false
  const sc = s.score as Record<string, unknown> | undefined
  if (!sc || typeof sc.x !== 'number' || typeof sc.o !== 'number' || typeof sc.draws !== 'number') return false
  if (s.winner !== null && s.winner !== 'X' && s.winner !== 'O' && s.winner !== 'draw') return false
  if (s.history !== undefined) {
    if (!Array.isArray(s.history)) return false
    for (const h of s.history) {
      const hr = h as Record<string, unknown> | undefined
      if (!hr || typeof hr.id !== 'string') return false
      if (hr.result !== 'X' && hr.result !== 'O' && hr.result !== 'draw') return false
      if (typeof hr.moves !== 'number') return false
    }
  }
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
    return { ...state, history: state.history ?? [] }
  },

  saveGame(state: GameState) {
    store.set(state)
  },

  clear() {
    store.clear()
  },
}
