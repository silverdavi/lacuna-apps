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

export const mockHost = {
  loadGame(): GameState {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return fresh()
      const parsed = JSON.parse(raw) as Partial<GameState>
      const board: (Mark | null)[] = Array.from({ length: 9 }, (_, i) => {
        const cell = Array.isArray(parsed.board) ? parsed.board[i] : null
        return cell === 'X' || cell === 'O' ? cell : null
      })
      const saved = parsed.score
      const num = (value: unknown) => (Number.isFinite(Number(value)) ? Number(value) : 0)
      const score = {
        x: num(saved?.x),
        o: num(saved?.o),
        draws: num(saved?.draws),
      }
      return {
        board,
        turn: parsed.turn === 'O' ? 'O' : 'X',
        score,
        winner: parsed.winner === 'X' || parsed.winner === 'O' || parsed.winner === 'draw' ? parsed.winner : null,
      }
    } catch {
      return fresh()
    }
  },

  saveGame(state: GameState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage is unavailable; the round stays in memory
    }
  },

  clear() {
    try {
      window.localStorage.removeItem(KEY)
    } catch {
      // storage is unavailable
    }
  },
}
