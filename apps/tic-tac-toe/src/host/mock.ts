import { createMockValue } from '@lacuna/host-mock'

const KEY = 'lacuna.tic-tac-toe.v2'

export type Mark = 'X' | 'O'

export type GameState = {
  board: (Mark | null)[]
  turn: Mark
  score: { x: number; o: number; draws: number }
  winner: Mark | 'draw' | null
}

const empty: GameState = {
  board: [null, null, null, null, null, null, null, null, null],
  turn: 'X',
  score: { x: 0, o: 0, draws: 0 },
  winner: null,
}

const fresh = (): GameState => ({ ...empty, board: [...empty.board], score: { ...empty.score } })

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
  return true
}

const store = createMockValue<GameState>({
  key: KEY,
  fallback: fresh(),
  validate: isValid,
})

export const mockHost = {
  loadGame(): GameState {
    return store.get()
  },

  saveGame(state: GameState) {
    store.set(state)
  },

  clear() {
    store.clear()
  },
}
