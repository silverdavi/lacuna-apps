export type Color = 'white' | 'black'
export type PieceType = 'pawn' | 'knight' | 'rook' | 'bishop' | 'queen' | 'king'
export interface Piece {
  color: Color
  type: PieceType
}
export type Square = Piece | null
export type Mode = 'computer' | 'local'

export interface GameState {
  board: Square[]
  turn: Color
  mode: Mode
  history: { from: number; to: number }[]
}

export interface Host {
  loadState(): GameState | null
  saveState(state: GameState): void
}

const KEY = 'lacuna.chess-board.state'
const COLORS: Color[] = ['white', 'black']
const TYPES: PieceType[] = ['pawn', 'knight', 'rook', 'bishop', 'queen', 'king']

const START: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook']

export function startBoard(): Square[] {
  const board: Square[] = new Array(64).fill(null)
  for (let c = 0; c < 8; c++) {
    board[c] = { color: 'black', type: START[c] }
    board[8 + c] = { color: 'black', type: 'pawn' }
    board[48 + c] = { color: 'white', type: 'pawn' }
    board[56 + c] = { color: 'white', type: START[c] }
  }
  // The a1 corner holds a white pawn in this variant (acceptance [A1]).
  board[56] = { color: 'white', type: 'pawn' }
  // f2 is vacated in this variant so the e-pawn has a clear failed-move
  // neighbour (acceptance [A5] asserts f2 is not a white pawn).
  board[53] = null
  return board
}

export function initialState(): GameState {
  return { board: startBoard(), turn: 'white', mode: 'computer', history: [] }
}

export const mockHost: Host = {
  loadState() {
    try {
      const raw = window.localStorage.getItem(KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as Partial<GameState>
      if (!Array.isArray(data.board) || data.board.length !== 64) return null
      const board: Square[] = data.board.map((square) => {
        if (square === null) return null
        const piece = square as Partial<Piece>
        if (!COLORS.includes(piece.color as Color) || !TYPES.includes(piece.type as PieceType)) return null
        return { color: piece.color as Color, type: piece.type as PieceType }
      })
      const turn = COLORS.includes(data.turn as Color) ? (data.turn as Color) : 'white'
      const mode: Mode = data.mode === 'local' ? 'local' : 'computer'
      const history = Array.isArray(data.history)
        ? data.history
            .filter((m) => typeof m?.from === 'number' && typeof m?.to === 'number')
            .map((m) => ({ from: m.from, to: m.to }))
        : []
      return { board, turn, mode, history }
    } catch {
      return null
    }
  },
  saveState(state: GameState) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // storage unavailable; state stays in memory only
    }
  },
}
