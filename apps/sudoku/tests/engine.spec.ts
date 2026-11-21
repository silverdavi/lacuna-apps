import { test, expect } from '@playwright/test'
import { mulberry32 } from '@lacuna/random'
import {
  CELLS,
  PRACTICE_EMPTY,
  SIZE,
  canPlace,
  cellIndex,
  colOf,
  conflictSet,
  elapsedSeconds,
  formatTime,
  hasConflict,
  isSolved,
  makeRecord,
  newPuzzle,
  placeDigit,
  rowOf,
  statusFor,
  type Board,
} from '../src/engine'

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

const EMPTY: Board = new Array<number>(CELLS).fill(0)

function practiceGiven(): Board {
  return PRACTICE_SOLUTION.map((v, i) => (PRACTICE_EMPTY.has(i) ? 0 : v))
}

function complete(board: Board): boolean {
  const i = board.indexOf(0)
  if (i === -1) return true
  for (let d = 1; d <= 9; d++) {
    if (!canPlace(board, i, d)) continue
    board[i] = d
    if (complete(board)) return true
    board[i] = 0
  }
  return false
}

function isValidGrid(board: Board): boolean {
  return (
    board.length === CELLS &&
    board.every((v) => Number.isInteger(v) && v >= 1 && v <= 9) &&
    hasConflict(board) === -1
  )
}

test('index math maps rows and columns to flat cell indices', () => {
  expect(cellIndex(0, 0)).toBe(0)
  expect(cellIndex(0, 8)).toBe(8)
  expect(cellIndex(8, 8)).toBe(80)
  expect(rowOf(1)).toBe(0)
  expect(colOf(1)).toBe(1)
  expect(rowOf(13)).toBe(1)
  expect(colOf(13)).toBe(4)
  expect(rowOf(80)).toBe(8)
  expect(colOf(80)).toBe(8)
})

test('canPlace checks the row, the column and the 3x3 box', () => {
  // Empty board: anything goes anywhere.
  expect(canPlace(EMPTY, 0, 5)).toBe(true)
  // Row conflict.
  expect(canPlace([5, 0, 0, 0, 0, 0, 0, 0, 0, ...EMPTY.slice(9)], 1, 5)).toBe(false)
  // Column conflict.
  expect(canPlace([0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3, 5)).toBe(false)
  // Box conflict without a row or column conflict: 5 sits at row 2 col 1
  // (index 10) and 8 sits at row 0 col 8 (index 8): both are in the top-right
  // box, but different rows and columns.
  const boxCase: Board = EMPTY.slice()
  boxCase[8] = 5
  boxCase[10] = 8
  expect(canPlace(boxCase, 2, 5)).toBe(false)
})

test('hasConflict and conflictSet name the repeated cells', () => {
  expect(hasConflict(PRACTICE_SOLUTION)).toBe(-1)
  expect(conflictSet(PRACTICE_SOLUTION).size).toBe(0)
  expect(hasConflict(EMPTY)).toBe(-1)
  expect(conflictSet(EMPTY).size).toBe(0)
  // Row conflict: 5 at index 8 (row 0) and 5 at index 17 (row 1 col 8, same
  // column) - the column repeat makes index 17 the first conflicted cell.
  const rowBoard: Board = EMPTY.slice()
  rowBoard[8] = 5
  rowBoard[17] = 5
  expect(hasConflict(rowBoard)).toBe(8)
  expect([...conflictSet(rowBoard)].sort((a, b) => a - b)).toEqual([8, 17])
  // The Practice givens hold 1 in Row 1 Column 1 (index 0). Put 1 in the empty
  // index 1 (Row 1 Column 2): the row now repeats, and column 2 already holds
  // a 1 at index 73 (Row 9 Column 2), so three cells end up conflicted.
  const given = practiceGiven()
  const board = given.slice()
  board[1] = 1
  expect(hasConflict(board)).toBe(0)
  expect([...conflictSet(board)].sort((a, b) => a - b)).toEqual([0, 1, 73])
  // A box-only conflict: the Practice givens hold 5 at index 4 (Row 1 Column 5)
  // and 8 at index 19 (Row 3 Column 1); placing 5 into the empty index 8
  // (Row 1 Column 9, same box as index 4) and 8 into the empty index 10
  // (Row 2 Column 1, same box as index 19) conflicts through the box alone.
  const board2 = given.slice()
  board2[8] = 5
  board2[10] = 8
  const bad = [...conflictSet(board2)].sort((a, b) => a - b)
  expect(bad).toEqual([4, 8, 10, 19, 25, 71])
})

test('isSolved and statusFor report the puzzle state', () => {
  expect(isSolved(PRACTICE_SOLUTION)).toBe(true)
  expect(isSolved(practiceGiven())).toBe(false)
  expect(isSolved(EMPTY)).toBe(false)
  // A full board with a repeat is not solved even though nothing is empty.
  const full: Board = PRACTICE_SOLUTION.slice()
  full[1] = 1 // replaces the 2 with a second 1 in the row
  expect(full.every((v) => v > 0)).toBe(true)
  expect(isSolved(full)).toBe(false)
  expect(statusFor(full)).toBe('Invalid move')
  const conflictBoard = practiceGiven().slice()
  conflictBoard[1] = 1
  expect(statusFor(conflictBoard)).toBe('Invalid move')
  expect(statusFor(PRACTICE_SOLUTION)).toBe('Puzzle Solved')
  expect(statusFor(practiceGiven())).toBe('')
})

test('placeDigit only writes into empty, non-given cells', () => {
  const given = practiceGiven()
  const board = given.slice()
  // A given cell (index 0 = 1) is untouched, the original board is returned.
  expect(placeDigit(given, board, 0, 7)).toBe(board)
  expect(board[0]).toBe(1)
  // An empty cell (index 1) takes the digit, in a new array.
  const next = placeDigit(given, board, 1, 2)
  expect(next).not.toBe(board)
  expect(next[1]).toBe(2)
  expect(board[1]).toBe(0)
  // Replacing the digit in the same cell.
  const again = placeDigit(given, next, 1, 5)
  expect(again[1]).toBe(5)
})

test('newPuzzle gives the fixed Practice board with exactly four empty cells', () => {
  const { given, board } = newPuzzle('Practice')
  expect(given).toEqual(PRACTICE_SOLUTION.map((v, i) => (PRACTICE_EMPTY.has(i) ? 0 : v)))
  expect(board).toEqual(given)
  const empties = given.map((v, i) => (v === 0 ? i : -1)).filter((i) => i !== -1)
  expect(empties).toEqual([1, 13, 40, 80])
})

test('newPuzzle Easy and Hard keep a valid solved grid under the givens', () => {
  for (const difficulty of ['Easy', 'Hard'] as const) {
    for (const seed of [7, 42, 999, 12345]) {
      const { given, board } = newPuzzle(difficulty, mulberry32(seed))
      expect(given).toEqual(board)
      expect(given.length).toBe(CELLS)
      const empty = given.filter((v) => v === 0).length
      if (difficulty === 'Hard') {
        // A Hard board keeps at most 50 givens: at least 30 empty cells.
        expect(empty).toBeGreaterThanOrEqual(30)
      } else {
        // Easy keeps exactly 32 givens.
        expect(empty).toBe(49)
      }
      // Complete the givens by backtracking search: the generated givens come
      // from a solved grid, so a completion always exists.
      const solution = given.slice()
      expect(complete(solution)).toBe(true)
      expect(isValidGrid(solution)).toBe(true)
      expect(isSolved(solution)).toBe(true)
    }
  }
})

test('newPuzzle Easy and Hard differ when the seed differs', () => {
  const a = newPuzzle('Easy', mulberry32(1))
  const b = newPuzzle('Easy', mulberry32(2))
  expect(a.given).not.toEqual(b.given)
})

test('makeRecord stamps the record with zero seconds and the given timestamps', () => {
  const rec = makeRecord('Practice', 1_700_000_000_000, 'id-1')
  expect(rec.id).toBe('id-1')
  expect(rec.kind).toBe('puzzle')
  expect(rec.difficulty).toBe('Practice')
  expect(rec.seconds).toBe(0)
  expect(rec.startedAt).toBe(1_700_000_000_000)
  expect(rec.updatedAt).toBe(1_700_000_000_000)
  expect(rec.board).toEqual(rec.given)
  expect(rec.board.length).toBe(CELLS)
})

test('formatTime pads minutes and seconds to two digits', () => {
  expect(formatTime(0)).toBe('00:00')
  expect(formatTime(5)).toBe('00:05')
  expect(formatTime(59)).toBe('00:59')
  expect(formatTime(60)).toBe('01:00')
  expect(formatTime(3723)).toBe('62:03')
})

test('elapsedSeconds clamps to the base when the clock goes backwards', () => {
  const base = { at: 1_000_000, seconds: 10 }
  expect(elapsedSeconds(base, 1_000_000)).toBe(10)
  expect(elapsedSeconds(base, 1_001_000)).toBe(11)
  expect(elapsedSeconds(base, 1_000_999)).toBe(10)
  expect(elapsedSeconds(base, 1_000_500)).toBe(10)
  expect(elapsedSeconds(base, 1_010_000)).toBe(20)
})
