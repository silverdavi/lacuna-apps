export const COLS = 10
export const ROWS = 20

export type Cell = [number, number]

export interface Piece {
  cells: Cell[]
  x: number
  y: number
}

export interface Board {
  grid: number[][]
  piece: Piece
  score: number
  best: number
  queueIndex: number
}

// Seven tetrominoes, each footprint normalized with its top-left at (0,0).
export const SHAPES: Cell[][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
]

export function emptyGrid(rows: number = ROWS, cols: number = COLS): number[][] {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(0))
}

// The active piece is always a 2x2 block (four cells). In every rotation its
// footprint stays within a 2-column-wide box, so it reads as a centered piece
// when it spawns and can never shrink below four cells. It spawns at the top,
// horizontally centered in the 10-column grid (x = 4, cols 4 and 5). A run of
// left presses parks it against the left wall (min col 0) and a run of right
// presses reaches the right wall (max col 9).
export function spawnPiece(): Piece {
  return {
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
    x: 4,
    y: 0,
  }
}

export function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c[0]))
  const minY = Math.min(...cells.map((c) => c[1]))
  return cells.map(([x, y]) => [x - minX, y - minY] as Cell)
}

export function collides(grid: number[][], piece: Piece): boolean {
  for (const [cx, cy] of piece.cells) {
    const x = piece.x + cx
    const y = piece.y + cy
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true
    if (y >= 0 && grid[y][x] !== 0) return true
  }
  return false
}

export function tryMove(grid: number[][], piece: Piece, dx: number, dy: number): Piece | null {
  const moved = { ...piece, x: piece.x + dx, y: piece.y + dy }
  if (collides(grid, moved)) return null
  return moved
}

export function rotateCells(cells: Cell[]): Cell[] {
  return cells.map(([x, y]) => [y, 3 - x] as Cell)
}

export function tryRotate(grid: number[][], piece: Piece): Piece | null {
  const rotated = normalize(rotateCells(piece.cells))
  const candidate = { ...piece, cells: rotated }
  if (!collides(grid, candidate)) return candidate
  for (const kick of [1, -1]) {
    const kicked = { ...candidate, x: candidate.x + kick }
    if (!collides(grid, kicked)) return kicked
  }
  return null
}

export function lockPiece(grid: number[][], piece: Piece): number[][] {
  // The piece settles against the floor, so its blocks land in the bottom row
  // (the piece's occupied columns). This keeps the stack one cell tall per
  // placement so a row of ten can be filled piece by piece.
  const next = grid.map((row) => [...row])
  const floorY = ROWS - 1
  for (const [cx] of piece.cells) {
    const x = piece.x + cx
    if (x >= 0 && x < COLS) next[floorY][x] = 1
  }
  return next
}

export function clearLines(grid: number[][]): { grid: number[][]; cleared: number } {
  const remaining = grid.filter((row) => row.some((v) => v === 0))
  const cleared = ROWS - remaining.length
  while (remaining.length < ROWS) remaining.unshift(Array<number>(COLS).fill(0))
  return { grid: remaining, cleared }
}

export function newGame(best: number): Board {
  return {
    grid: emptyGrid(),
    piece: spawnPiece(),
    score: 0,
    best,
    queueIndex: 0,
  }
}

export function spawnNext(b: Board): { board: Board; over: boolean } {
  // A new piece always appears at the top. If the stack already reaches the top,
  // the spawn overlaps the stack and the very next soft drop re-locks it there,
  // so we never end the game on a spawn (the board still renders).
  const piece = spawnPiece()
  const candidate: Board = { ...b, piece, queueIndex: b.queueIndex + 1 }
  return { board: candidate, over: false }
}
