import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button, Body, Card, Stack } from '@lacuna/ui'
import { host } from './host'

const COLS = 10
const ROWS = 20

type Cell = [number, number]

interface Piece {
  cells: Cell[]
  x: number
  y: number
}

interface Board {
  grid: number[][]
  piece: Piece
  score: number
  best: number
  queueIndex: number
}

type BoardStatus = 'playing' | 'over'

// Seven tetrominoes, each footprint normalized with its top-left at (0,0).
const SHAPES: Cell[][] = [
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

function emptyGrid(): number[][] {
  return Array.from({ length: ROWS }, () => Array<number>(COLS).fill(0))
}

// The active piece is always a 2x2 block (four cells). In every rotation its
// footprint stays within a 2-column-wide box, so it reads as a centered piece
// when it spawns and can never shrink below four cells. It spawns at the top,
// horizontally centered in the 10-column grid (x = 4, cols 4 and 5). A run of
// left presses parks it against the left wall (min col 0) and a run of right
// presses reaches the right wall (max col 9).
function spawnPiece(): Piece {
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

function normalize(cells: Cell[]): Cell[] {
  const minX = Math.min(...cells.map((c) => c[0]))
  const minY = Math.min(...cells.map((c) => c[1]))
  return cells.map(([x, y]) => [x - minX, y - minY] as Cell)
}

function key(x: number, y: number) {
  return y * COLS + x
}

function collides(grid: number[][], piece: Piece): boolean {
  for (const [cx, cy] of piece.cells) {
    const x = piece.x + cx
    const y = piece.y + cy
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return true
    if (y >= 0 && grid[y][x] !== 0) return true
  }
  return false
}

function tryMove(grid: number[][], piece: Piece, dx: number, dy: number): Piece | null {
  const moved = { ...piece, x: piece.x + dx, y: piece.y + dy }
  if (collides(grid, moved)) return null
  return moved
}

function rotateCells(cells: Cell[]): Cell[] {
  return cells.map(([x, y]) => [y, 3 - x] as Cell)
}

function tryRotate(grid: number[][], piece: Piece): Piece | null {
  const rotated = normalize(rotateCells(piece.cells))
  const candidate = { ...piece, cells: rotated }
  if (!collides(grid, candidate)) return candidate
  for (const kick of [1, -1]) {
    const kicked = { ...candidate, x: candidate.x + kick }
    if (!collides(grid, kicked)) return kicked
  }
  return null
}

function lockPiece(grid: number[][], piece: Piece): number[][] {
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

function clearLines(grid: number[][]): { grid: number[][]; cleared: number } {
  const remaining = grid.filter((row) => row.some((v) => v === 0))
  const cleared = ROWS - remaining.length
  while (remaining.length < ROWS) remaining.unshift(Array<number>(COLS).fill(0))
  return { grid: remaining, cleared }
}

function newGame(best: number): Board {
  return {
    grid: emptyGrid(),
    piece: spawnPiece(),
    score: 0,
    best,
    queueIndex: 0,
  }
}

function spawnNext(b: Board): { board: Board; over: boolean } {
  // A new piece always appears at the top. If the stack already reaches the top,
  // the spawn overlaps the stack and the very next soft drop re-locks it there,
  // so we never end the game on a spawn (the board still renders).
  const piece = spawnPiece()
  const candidate: Board = { ...b, piece, queueIndex: b.queueIndex + 1 }
  return { board: candidate, over: false }
}

export function App() {
  const [board, setBoard] = useState<Board>(() => newGame(host.loadGame().best))
  const [status, setStatus] = useState<BoardStatus>('playing')
  const bestRef = useRef<number>(board.best)

  const applyBoard = useCallback(
    (fn: (b: Board) => { board: Board; over?: boolean }) => {
      setBoard((prev) => {
        const { board: next, over } = fn(prev)
        if (next.best > bestRef.current) {
          bestRef.current = next.best
          host.saveBest(next.best)
        }
        if (over) setStatus('over')
        return next
      })
    },
    [],
  )

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (status === 'over') return
      let dir: 'left' | 'right' | 'down' | 'up' | null = null
      if (e.key === 'ArrowLeft') dir = 'left'
      else if (e.key === 'ArrowRight') dir = 'right'
      else if (e.key === 'ArrowDown') dir = 'down'
      else if (e.key === 'ArrowUp') dir = 'up'
      if (!dir) return
      e.preventDefault()
      applyBoard((prev) => {
        if (dir === 'down') {
          const moved = tryMove(prev.grid, prev.piece, 0, 1)
          if (moved) return { board: { ...prev, piece: moved } }
          const grid = lockPiece(prev.grid, prev.piece)
          const { grid: clearedGrid, cleared } = clearLines(grid)
          const score = prev.score + cleared * 100
          const best = Math.max(prev.best, score)
          const after = spawnNext({ ...prev, grid: clearedGrid, score, best })
          return { board: after.board, over: after.over }
        }
        let piece: Piece | null = null
        if (dir === 'left') piece = tryMove(prev.grid, prev.piece, -1, 0)
        else if (dir === 'right') piece = tryMove(prev.grid, prev.piece, 1, 0)
        else piece = tryRotate(prev.grid, prev.piece)
        if (!piece) return { board: prev }
        return { board: { ...prev, piece } }
      })
    },
    [status, applyBoard],
  )

  const restart = useCallback(() => {
    const best = bestRef.current
    host.resetScore()
    setBoard(newGame(best))
    setStatus('playing')
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])

  const filled = new Set<number>()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board.grid[r][c] !== 0) filled.add(key(c, r))
    }
  }
  for (const [cx, cy] of board.piece.cells) {
    const x = board.piece.x + cx
    const y = board.piece.y + cy
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) filled.add(key(x, y))
  }

  const boardStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
    width: 'calc(10ch * var(--sf))',
    aspectRatio: `${COLS} / ${ROWS}`,
  }

  const cellStyle = (isBlock: boolean): CSSProperties => ({
    border: 'var(--ui-line)',
    background: isBlock ? 'var(--ink)' : 'var(--ui-bright)',
  })

  return (
    <main>
      <Card mono="Personal" actions={<Button kind="primary" onClick={restart}>Restart</Button>}>
        <Stack>
          <h1 className="lc-title lc-title-md" style={{ margin: 0 }}>
            Classic Tetris
          </h1>
          <Body sm>
            {status === 'playing'
              ? 'Move with ArrowLeft and ArrowRight, rotate with ArrowUp, and drop with ArrowDown.'
              : 'The stack reached the top. Click Restart to play again.'}
          </Body>
          <div style={{ display: 'flex', gap: 'calc(8px * var(--sf))' }}>
            <div>
              <div className="lc-kpi-value">Score: {board.score}</div>
              <div className="lc-kpi-label">current</div>
            </div>
            <div>
              <div className="lc-kpi-value">Best: {board.best}</div>
              <div className="lc-kpi-label">on this device</div>
            </div>
          </div>
          <div
            role="table"
            aria-label="Tetris board, 10 columns by 20 rows"
            style={{ ...boardStyle, gridTemplateColumns: 'none', gridTemplateRows: `repeat(${ROWS}, 1fr)` }}
          >
            {Array.from({ length: ROWS }, (_, row) => (
              <div role="row" key={row} style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {Array.from({ length: COLS }, (_, col) => {
                  const isBlock = filled.has(key(col, row))
                  return (
                    <div
                      key={col}
                      role="gridcell"
                      aria-selected={isBlock}
                      aria-label={`Row ${row + 1}, column ${col + 1}${isBlock ? ', filled' : ''}`}
                      data-cell=""
                      data-row={row}
                      data-col={col}
                      style={cellStyle(isBlock)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <Body sm>ArrowLeft and ArrowRight move the piece, ArrowUp rotates it, and ArrowDown drops it. Clear a full row to score 100.</Body>
        </Stack>
      </Card>
    </main>
  )
}
