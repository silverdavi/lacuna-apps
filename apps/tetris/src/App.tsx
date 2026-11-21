import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AppShell, Button, Card, Kpi, KpiRow } from '@lacuna/ui'
import { useHotkeys } from '@lacuna/use-hotkeys'
import { host } from './host'
import { COLS, ROWS, type Board, newGame, spawnNext, tryMove, tryRotate, lockPiece, clearLines } from './engine'
import { CELL_FILLED, CELL_EMPTY, CELL_BORDER } from './colors'

type BoardStatus = 'playing' | 'over'

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

  const moveLeft = useCallback(() => {
    applyBoard((prev) => {
      const piece = tryMove(prev.grid, prev.piece, -1, 0)
      if (!piece) return { board: prev }
      return { board: { ...prev, piece } }
    })
  }, [applyBoard])

  const moveRight = useCallback(() => {
    applyBoard((prev) => {
      const piece = tryMove(prev.grid, prev.piece, 1, 0)
      if (!piece) return { board: prev }
      return { board: { ...prev, piece } }
    })
  }, [applyBoard])

  const rotate = useCallback(() => {
    applyBoard((prev) => {
      const piece = tryRotate(prev.grid, prev.piece)
      if (!piece) return { board: prev }
      return { board: { ...prev, piece } }
    })
  }, [applyBoard])

  const softDrop = useCallback(() => {
    applyBoard((prev) => {
      const moved = tryMove(prev.grid, prev.piece, 0, 1)
      if (moved) return { board: { ...prev, piece: moved } }
      const grid = lockPiece(prev.grid, prev.piece)
      const { grid: clearedGrid, cleared } = clearLines(grid)
      const score = prev.score + cleared * 100
      const best = Math.max(prev.best, score)
      const after = spawnNext({ ...prev, grid: clearedGrid, score, best })
      return { board: after.board, over: after.over }
    })
  }, [applyBoard])

  useHotkeys([
    { keys: 'ArrowLeft', handler: () => moveLeft(), description: 'Move piece left' },
    { keys: 'ArrowRight', handler: () => moveRight(), description: 'Move piece right' },
    { keys: 'ArrowUp', handler: () => rotate(), description: 'Rotate piece' },
    { keys: 'ArrowDown', handler: () => softDrop(), description: 'Soft drop' },
  ], { enabled: status === 'playing' })

  const restart = useCallback(() => {
    const best = bestRef.current
    host.resetScore()
    setBoard(newGame(best))
    setStatus('playing')
  }, [])

  const filled = new Set<number>()
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board.grid[r][c] !== 0) filled.add(r * COLS + c)
    }
  }
  for (const [cx, cy] of board.piece.cells) {
    const x = board.piece.x + cx
    const y = board.piece.y + cy
    if (y >= 0 && y < ROWS && x >= 0 && x < COLS) filled.add(y * COLS + x)
  }

  const boardStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
    gap: 'calc(2px * var(--sf))',
    border: `calc(1px * var(--sf)) solid ${CELL_BORDER}`,
    borderRadius: 'calc(8px * var(--sf))',
    padding: 'calc(4px * var(--sf))',
    background: 'var(--paper-deep)',
  }

  const cellStyle: CSSProperties = {
    aspectRatio: '1',
    borderRadius: 'calc(2px * var(--sf))',
    border: `calc(1px * var(--sf)) solid ${CELL_BORDER}`,
  }

  return (
    <AppShell name="Classic Tetris" icon="grid" hue="cobalt" category="Personal">
      <Card mono="Personal" actions={<Button kind="primary" onClick={restart}>Restart</Button>}>
        <KpiRow>
          <Kpi value={`Score: ${board.score}`} label="Score" />
          <Kpi value={`Best: ${board.best}`} label="Best" />
        </KpiRow>
        <div style={boardStyle} role="group" aria-label={`Tetris board, ${COLS} columns by ${ROWS} rows`}>
          {Array.from({ length: ROWS }, (_, row) =>
            Array.from({ length: COLS }, (_, col) => {
              const isBlock = filled.has(row * COLS + col)
              return (
                <div
                  key={`${row}-${col}`}
                  data-cell=""
                  data-row={row}
                  data-col={col}
                  data-block={isBlock ? 'true' : 'false'}
                  style={{
                    ...cellStyle,
                    background: isBlock ? CELL_FILLED : CELL_EMPTY,
                  }}
                />
              )
            }),
          )}
        </div>
        {status === 'over' && (
          <p style={{ color: 'var(--danger)', fontFamily: 'var(--sans)' }}>
            Game over. Press Restart to play again.
          </p>
        )}
      </Card>
    </AppShell>
  )
}
