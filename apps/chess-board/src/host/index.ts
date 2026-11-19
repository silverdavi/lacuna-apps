import { mockHost } from './mock'
import type { Host, GameState, Piece, Square, Color, Mode } from './mock'

export const host: Host = mockHost

export type { GameState, Host, Piece, Square, Color, Mode } from './mock'
export { initialState } from './mock'

export const FILES = 'abcdefgh'

export const squareName = (index: number) => FILES[index % 8] + String(8 - Math.floor(index / 8))

export const indexFromName = (name: string) => {
  const file = FILES.indexOf(name[0])
  const rank = Number(name[1])
  if (file < 0 || rank < 1 || rank > 8) return -1
  return (8 - rank) * 8 + file
}

function inBounds(row: number, col: number) {
  return row >= 0 && row < 8 && col >= 0 && col < 8
}

export function legalMoves(board: Square[], index: number): number[] {
  const piece = board[index]
  if (!piece) return []
  const row = Math.floor(index / 8)
  const col = index % 8
  const moves: number[] = []
  const push = (r: number, c: number) => {
    if (inBounds(r, c)) moves.push(r * 8 + c)
  }
  const slide = (dirs: number[][]) => {
    for (const [dr, dc] of dirs) {
      let r = row + dr
      let c = col + dc
      while (inBounds(r, c)) {
        const target = board[r * 8 + c]
        if (!target) {
          moves.push(r * 8 + c)
        } else {
          if (target.color !== piece.color) moves.push(r * 8 + c)
          break
        }
        r += dr
        c += dc
      }
    }
  }
  if (piece.type === 'pawn') {
    const dir = piece.color === 'white' ? -1 : 1
    const startRow = piece.color === 'white' ? 6 : 1
    if (inBounds(row + dir, col) && !board[(row + dir) * 8 + col]) {
      moves.push((row + dir) * 8 + col)
      if (row === startRow && !board[(row + 2 * dir) * 8 + col]) moves.push((row + 2 * dir) * 8 + col)
    }
    for (const dc of [-1, 1]) {
      if (inBounds(row + dir, col + dc)) {
        const target = board[(row + dir) * 8 + (col + dc)]
        if (target && target.color !== piece.color) moves.push((row + dir) * 8 + (col + dc))
      }
    }
  } else if (piece.type === 'knight') {
    for (const [dr, dc] of [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]]) {
      if (inBounds(row + dr, col + dc)) {
        const target = board[(row + dr) * 8 + (col + dc)]
        if (!target || target.color !== piece.color) moves.push((row + dr) * 8 + (col + dc))
      }
    }
  } else if (piece.type === 'bishop') {
    slide([[-1, -1], [-1, 1], [1, -1], [1, 1]])
  } else if (piece.type === 'rook') {
    slide([[-1, 0], [1, 0], [0, -1], [0, 1]])
  } else if (piece.type === 'queen') {
    slide([[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]])
  } else {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue
        if (inBounds(row + dr, col + dc)) {
          const target = board[(row + dr) * 8 + (col + dc)]
          if (!target || target.color !== piece.color) moves.push((row + dr) * 8 + (col + dc))
        }
      }
    }
  }
  return moves
}

export function applyMove(board: Square[], from: number, to: number): Square[] {
  const next = board.slice()
  next[to] = next[from]
  next[from] = null
  return next
}

const centrality = (index: number) => 7 - Math.abs((index % 8) - 4)

export function computerReply(board: Square[], color: Color): { from: number; to: number } | null {
  const candidates: { from: number; to: number }[] = []
  for (let from = 0; from < 64; from++) {
    const piece = board[from]
    if (!piece || piece.color !== color) continue
    for (const to of legalMoves(board, from)) candidates.push({ from, to })
  }
  if (candidates.length === 0) return null
  const best = (moves: { from: number; to: number }[]) =>
    moves.reduce((a, b) => (centrality(b.to) > centrality(a.to) ? b : a))
  const twoStep = candidates.filter((m) => Math.abs(m.to - m.from) === 16 && board[m.from]?.type === 'pawn')
  if (twoStep.length > 0) return best(twoStep)
  const captures = candidates.filter((m) => board[m.to] !== null)
  if (captures.length > 0) return best(captures)
  const pawnSteps = candidates.filter((m) => board[m.from]?.type === 'pawn')
  if (pawnSteps.length > 0) return best(pawnSteps)
  return best(candidates)
}
