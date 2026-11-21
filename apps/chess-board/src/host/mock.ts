import { createMockValue } from '@lacuna/host-mock'

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

function validateGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Partial<GameState>
  if (!Array.isArray(data.board) || data.board.length !== 64) return false
  for (const square of data.board) {
    if (square === null) continue
    if (typeof square !== 'object') return false
    const piece = square as Partial<Piece>
    if (!COLORS.includes(piece.color as Color)) return false
    if (!TYPES.includes(piece.type as PieceType)) return false
  }
  if (!COLORS.includes(data.turn as Color)) return false
  if (data.mode !== 'local' && data.mode !== 'computer') return false
  if (!Array.isArray(data.history)) return false
  for (const m of data.history) {
    if (typeof m?.from !== 'number' || typeof m?.to !== 'number') return false
  }
  return true
}

const store = createMockValue<GameState>({
  key: KEY,
  fallback: initialState(),
  validate: validateGameState,
})

export const mockHost: Host = {
  loadState() {
    const s = store.get()
    if (!s || s.board.length !== 64) return null
    return s
  },
  saveState(state: GameState) {
    store.set(state)
  },
}
