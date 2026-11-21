import { mulberry32, randomInt, shuffle, type Rng } from '@lacuna/random'
import type { Difficulty, PuzzleRecord } from './host'

export type { Difficulty } from './host'

export const SIZE = 9
export const CELLS = SIZE * SIZE
export type Board = number[]
export type RngSource = Rng | number
export type PuzzleSeed = { given: Board; board: Board }
export type TimerBase = { at: number; seconds: number }

// "Practice" is a fixed board: the solved grid below with exactly four empty
// cells. Each empty cell's index is row * 9 + (col - 1); the cell's solution
// value (used by the acceptance check for the Practice board):
//   Row 1 Column 2 -> index  1 -> 2
//   Row 2 Column 5 -> index 13 -> 8
//   Row 5 Column 5 -> index 40 -> 5
//   Row 9 Column 9 -> index 80 -> 8
const PRACTICE_SOLUTION: Board = [
  1, 2, 3, 4, 5, 6, 7, 8, 9,
  4, 5, 6, 7, 8, 9, 1, 2, 3,
  7, 8, 9, 1, 2, 3, 4, 5, 6,
  2, 3, 4, 5, 6, 7, 8, 9, 1,
  5, 6, 7, 8, 9, 1, 2, 3, 4,
  8, 9, 1, 2, 3, 4, 5, 6, 7,
  3, 4, 5, 6, 7, 8, 9, 1, 2,
  6, 7, 8, 9, 1, 2, 3, 4, 5,
  9, 1, 2, 3, 4, 5, 6, 7, 8,
]

export const PRACTICE_EMPTY = new Set<number>([1, 13, 40, 80])

const DIGITS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

// Given-cell counts per difficulty. Easy keeps 32 of the 81 cells, Hard keeps
// at most 50, so a Hard board always leaves at least 30 empty cells.
const GIVENS: Record<Exclude<Difficulty, 'Practice'>, number> = {
  Easy: 32,
  Hard: 50,
}

export function rowOf(index: number): number {
  return Math.floor(index / SIZE)
}

export function colOf(index: number): number {
  return index % SIZE
}

export function cellIndex(row: number, col: number): number {
  return row * SIZE + col
}

export function canPlace(board: Board, index: number, value: number): boolean {
  const r = rowOf(index)
  const c = colOf(index)
  const br = Math.floor(r / 3)
  const bc = Math.floor(c / 3)
  for (let k = 0; k < SIZE; k++) {
    if (board[r * SIZE + k] === value) return false
    if (board[k * SIZE + c] === value) return false
  }
  for (let k = 0; k < 9; k++) {
    if (board[(br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3)] === value) return false
  }
  return true
}

export function fillGrid(board: Board, rng: Rng): boolean {
  const i = board.indexOf(0)
  if (i === -1) return true
  for (const n of shuffle(rng, DIGITS)) {
    if (!canPlace(board, i, n)) continue
    board[i] = n
    if (fillGrid(board, rng)) return true
    board[i] = 0
  }
  return false
}

export function newPuzzle(difficulty: Difficulty, rngSource?: RngSource): PuzzleSeed {
  if (difficulty === 'Practice') {
    const given = PRACTICE_SOLUTION.map((v, i) => (PRACTICE_EMPTY.has(i) ? 0 : v))
    return { given, board: [...given] }
  }
  const rng: Rng =
    rngSource === undefined
      ? mulberry32(randomInt(mulberry32(Date.now()), 0, 0x7fffffff))
      : typeof rngSource === 'number'
        ? mulberry32(rngSource)
        : rngSource
  const solved: Board = new Array<number>(CELLS).fill(0)
  if (!fillGrid(solved, rng)) throw new Error('could not build a board')
  const keep = GIVENS[difficulty]
  const keepIndex = new Set(
    shuffle(rng, Array.from({ length: CELLS }, (_, i) => i)).slice(0, keep),
  )
  const given = solved.map((v, i) => (keepIndex.has(i) ? v : 0))
  return { given, board: [...given] }
}

export function makeRecord(difficulty: Difficulty, now: number, id: string, rngSource?: RngSource): PuzzleRecord {
  const { given, board } = newPuzzle(difficulty, rngSource)
  return {
    id,
    kind: 'puzzle',
    difficulty,
    given,
    board,
    seconds: 0,
    startedAt: now,
    updatedAt: now,
  }
}

export function formatTime(total: number): string {
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function isSolved(board: Board): boolean {
  return board.every((v) => v > 0) && hasConflict(board) === -1
}

// Index of a cell whose value repeats in its row, column or box, or -1.
export function hasConflict(board: Board): number {
  for (let i = 0; i < board.length; i++) {
    const v = board[i]
    if (v === 0) continue
    const r = rowOf(i)
    const c = colOf(i)
    const br = Math.floor(r / 3)
    const bc = Math.floor(c / 3)
    for (let k = 0; k < SIZE; k++) {
      if (r * SIZE + k !== i && board[r * SIZE + k] === v) return i
      if (k * SIZE + c !== i && board[k * SIZE + c] === v) return i
    }
    for (let k = 0; k < 9; k++) {
      const bi = (br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3)
      if (bi !== i && board[bi] === v) return i
    }
  }
  return -1
}

export function conflictSet(board: Board): Set<number> {
  const bad = new Set<number>()
  for (let i = 0; i < board.length; i++) {
    const v = board[i]
    if (v === 0) continue
    const r = rowOf(i)
    const c = colOf(i)
    const br = Math.floor(r / 3)
    const bc = Math.floor(c / 3)
    for (let k = 0; k < SIZE; k++) {
      if (r * SIZE + k !== i && board[r * SIZE + k] === v) bad.add(i)
      if (k * SIZE + c !== i && board[k * SIZE + c] === v) bad.add(i)
    }
    for (let k = 0; k < 9; k++) {
      const bi = (br * 3 + Math.floor(k / 3)) * SIZE + bc * 3 + (k % 3)
      if (bi !== i && board[bi] === v) bad.add(i)
    }
  }
  return bad
}

export function statusFor(board: Board): string {
  if (isSolved(board)) return 'Puzzle Solved'
  return conflictSet(board).size > 0 ? 'Invalid move' : ''
}

export function placeDigit(given: Board, board: Board, index: number, digit: number): Board {
  if (given[index] !== 0) return board
  const next = [...board]
  next[index] = digit
  return next
}

export function elapsedSeconds(base: TimerBase, now: number): number {
  return base.seconds + Math.max(0, Math.floor((now - base.at) / 1000))
}
