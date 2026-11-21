import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button, Body, Card, Stack } from '@lacuna/ui'
import { host } from './host'
import {
  COLS,
  ROWS,
  type Board,
  newGame,
  spawnNext,
  tryMove,
  tryRotate,
  lockPiece,
  clearLines,
} from './engine'

type BoardStatus = 'playing' | 'over'

function key(x: number, y: number) {
  return y * COLS + x
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
        let piece = null
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
