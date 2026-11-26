import { test, expect } from '@playwright/test'
import {
  COLS,
  ROWS,
  type Piece,
  emptyGrid,
  spawnPiece,
  normalize,
  collides,
  tryMove,
  rotateCells,
  tryRotate,
  lockPiece,
  clearLines,
  newGame,
  spawnNext,
} from '../src/engine'

const piece = (): Piece => spawnPiece()

test('emptyGrid and newGame lay out the 10x20 field with a centered spawn', () => {
  const grid = emptyGrid()
  expect(grid.length).toBe(ROWS)
  expect(grid.every((row) => row.length === COLS && row.every((v) => v === 0))).toBe(true)
  expect(ROWS).toBe(20)
  expect(COLS).toBe(10)

  const game = newGame(5)
  expect(game.score).toBe(0)
  expect(game.best).toBe(5)
  expect(game.queueIndex).toBe(0)
  expect(collides(game.grid, game.piece)).toBe(false)
  expect(piece().x).toBe(4)
  expect(piece().y).toBe(0)
  expect(piece().cells.map(([x]) => x).sort((a, b) => a - b)).toEqual([0, 0, 1, 1])
})

test('tryMove moves one cell and refuses at the walls', () => {
  const grid = emptyGrid()
  const p = piece()
  const left = tryMove(grid, p, -1, 0)
  expect(left?.x).toBe(3)
  const right = tryMove(grid, p, 1, 0)
  expect(right?.x).toBe(5)
  const down = tryMove(grid, p, 0, 1)
  expect(down?.y).toBe(1)

  const atLeft = { ...p, x: 0 }
  expect(tryMove(grid, atLeft, -1, 0)).toBeNull()
  expect(tryMove(grid, atLeft, 1, 0)?.x).toBe(1)

  const atRight = { ...p, x: 8 }
  expect(tryMove(grid, atRight, 1, 0)).toBeNull()
  expect(tryMove(grid, atRight, -1, 0)?.x).toBe(7)

  const atTop = { ...p, y: -1 }
  expect(tryMove(grid, atTop, 0, -1)).toBeNull()

  const atFloor = { ...p, y: 18 }
  expect(tryMove(grid, atFloor, 0, 1)).toBeNull()
  expect(tryMove(grid, atFloor, -1, 0)?.y).toBe(18)
})

test('collides detects the walls and locked cells', () => {
  const grid = emptyGrid()
  const p = piece()
  expect(collides(grid, p)).toBe(false)
  expect(collides(grid, { ...p, x: -1 })).toBe(true)
  expect(collides(grid, { ...p, x: 9 })).toBe(true)
  expect(collides(grid, { ...p, y: 20 })).toBe(true)

  grid[0][0] = 1
  expect(collides(grid, p)).toBe(false)
  const atWall = { ...p, x: 0 }
  expect(collides(grid, atWall)).toBe(true)
})

test('rotateCells is a 90 degree clockwise rotation and normalizing closes the cycle', () => {
  const cells: [number, number][] = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ]
  expect(rotateCells(cells)).toEqual([
    [0, 3],
    [0, 2],
    [1, 3],
    [1, 2],
  ])
  // four turns give the original footprint back
  let current = cells
  for (let i = 0; i < 4; i++) current = rotateCells(current)
  expect(normalize(current)).toEqual(normalize(cells))
})

test('tryRotate keeps the piece in place when the wall blocks every kick', () => {
  const grid = emptyGrid()
  const p = piece()
  const atLeft = { ...p, x: 0 }
  const rotated = tryRotate(grid, atLeft)
  if (rotated === null) throw new Error('expected the kick to keep the rotation in place')
  expect(rotated.x).toBe(0)
  expect(rotated.cells).toEqual(normalize(rotateCells(p.cells)))
  expect(collides(grid, rotated)).toBe(false)

  const p2 = { ...p, x: 4, cells: normalize(rotateCells(normalize(rotateCells(p.cells)))) }
  const rotated2 = tryRotate(grid, p2)
  if (rotated2 === null) throw new Error('expected the kick to keep the rotation in place')
  expect(rotated2.cells).toEqual(normalize(rotateCells(p2.cells)))
})

test('lockPiece stamps the bottom row and returns a new grid', () => {
  const grid = emptyGrid()
  const p = { ...piece(), x: 3, y: 19 }
  const locked = lockPiece(grid, p)
  expect(locked).not.toBe(grid)
  expect(locked[19]).toEqual([0, 0, 0, 1, 1, 0, 0, 0, 0, 0])
  expect(grid[19]).toEqual(Array(COLS).fill(0))
  expect(locked.slice(0, 19).every((row) => row.every((v) => v === 0))).toBe(true)
})

test('clearLines removes full rows, shifts blocks down, and counts clears', () => {
  const grid = emptyGrid()
  grid[19].fill(1)
  grid[18][5] = 1
  const { grid: cleared, cleared: clearedCount } = clearLines(grid)
  expect(clearedCount).toBe(1)
  expect(cleared.length).toBe(ROWS)
  expect(cleared[19]).toEqual([0, 0, 0, 0, 0, 1, 0, 0, 0, 0])
  expect(cleared[18].every((v) => v === 0)).toBe(true)

  const two = emptyGrid()
  two[18].fill(1)
  two[19].fill(1)
  expect(clearLines(two).cleared).toBe(2)

  expect(clearLines(emptyGrid()).cleared).toBe(0)
  const partial = emptyGrid()
  partial[19][0] = 1
  partial[19][COLS - 1] = 1
  expect(clearLines(partial).cleared).toBe(0)
})

test('spawnNext resets the piece to the top center and advances the queue', () => {
  const g = newGame(0)
  const before = { ...g, piece: { ...g.piece, x: 1, y: 17 }, score: 200, best: 200 }
  const { board, over } = spawnNext(before)
  expect(over).toBe(false)
  expect(board.piece).toEqual(piece())
  expect(board.queueIndex).toBe(before.queueIndex + 1)
  expect(board.score).toBe(200)
  expect(board.best).toBe(200)
  expect(board.grid).toBe(before.grid)
})
