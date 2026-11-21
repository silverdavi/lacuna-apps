import { useCallback, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  Rail,
  SectionLabel,
  Tag,
} from '@lacuna/ui'
import { useHotkeys } from '@lacuna/use-hotkeys'
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
import { PIECE_COLOR, NEXT_PIECE_COLOR, BOARD_BG, BOARD_BORDER } from './colors'

type BoardStatus = 'playing' | 'paused' | 'over'

const BOARD_STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(${COLS}, 1fr)`,
  gap: 'calc(2px * var(--sf))',
  border: `calc(1px * var(--sf)) solid ${BOARD_BORDER}`,
  borderRadius: 'calc(4px * var(--sf))',
  padding: 'calc(4px * var(--sf))',
  background: BOARD_BG,
}

const CELL_STYLE: CSSProperties = {
  aspectRatio: '1',
  borderRadius: 'calc(2px * var(--sf))',
}

function levelFor(score: number): number {
  return Math.floor(score / 1000) + 1
}

export function App() {
  const [board, setBoard] = useState<Board>(() => newGame(host.loadGame().best))
  const [status, setStatus] = useState<BoardStatus>('playing')
  const [linesCleared, setLinesCleared] = useState(0)
  const bestRef = useRef<number>(board.best)

  const applyBoard = useCallback(
    (fn: (b: Board) => { board: Board; over?: boolean; cleared?: number }) => {
      setBoard((prev) => {
        const { board: next, over, cleared } = fn(prev)
        if (cleared !== undefined) setLinesCleared((n) => n + cleared)
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
      return { board: after.board, over: after.over, cleared }
    })
  }, [applyBoard])

  useHotkeys(
    [
      { keys: 'ArrowLeft', handler: () => moveLeft(), description: 'Move piece left' },
      { keys: 'ArrowRight', handler: () => moveRight(), description: 'Move piece right' },
      { keys: 'ArrowUp', handler: () => rotate(), description: 'Rotate piece' },
      { keys: 'ArrowDown', handler: () => softDrop(), description: 'Soft drop' },
    ],
    { enabled: status === 'playing' },
  )

  const restart = useCallback(() => {
    const best = bestRef.current
    host.resetScore()
    setBoard(newGame(best))
    setLinesCleared(0)
    setStatus('playing')
  }, [])

  const togglePause = useCallback(() => {
    setStatus((s) => (s === 'playing' ? 'paused' : 'playing'))
  }, [])

  useHotkeys([{ keys: 'Escape', handler: togglePause, description: 'Pause' }], { enabled: status !== 'over' })

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

  const nextCells = new Set<number>()
  for (const [cx, cy] of board.piece.cells) {
    nextCells.add(cy * 4 + cx)
  }

  const statusText =
    status === 'over'
      ? `Game over · final ${board.score}`
      : status === 'paused'
        ? 'Paused'
        : `Playing · ${COLS}×${ROWS} · local`

  return (
    <AppShell
      name="Classic Tetris"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta="10×20 field"
      status={statusText}
      side={
        <Rail
          title={status === 'over' ? 'Game over' : 'Controls'}
          note={status === 'over' ? 'Restart to play again' : 'Keyboard'}
          chips={status === 'over' ? undefined : ['← → move', '↑ rotate', '↓ drop']}
        >
          <KpiRow>
            <Kpi value={`Score: ${board.score}`} label="Score" accent />
            <Kpi value={`Best: ${board.best}`} label="Best" />
            <Kpi value={String(linesCleared)} label="Lines" />
            <Kpi value={String(levelFor(board.score))} label="Level" />
          </KpiRow>
          <SectionLabel>Next</SectionLabel>
          <div
            role="group"
            aria-label="Next piece"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 'calc(2px * var(--sf))',
              width: 'fit-content',
            }}
          >
            {Array.from({ length: 16 }, (_, i) => {
              const row = Math.floor(i / 4)
              const col = i % 4
              const isNext = nextCells.has(i)
              return (
                <div
                  key={i}
                  style={{
                    ...CELL_STYLE,
                    width: 'calc(16px * var(--sf))',
                    height: 'calc(16px * var(--sf))',
                    background: isNext ? NEXT_PIECE_COLOR : undefined,
                  }}
                />
              )
            })}
          </div>
          <SectionLabel>Keys</SectionLabel>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 'calc(12px * var(--tf))', color: 'var(--ink-60)', lineHeight: 1.8 }}>
            <div>← → move</div>
            <div>↑ rotate</div>
            <div>↓ soft drop</div>
            <div>Esc pause</div>
          </div>
        </Rail>
      }
    >
      <Card
        mono="Personal"
        title="Field"
        actions={
          <Actions>
            {status === 'paused' ? (
              <Button kind="primary" onClick={togglePause}>
                Start
              </Button>
            ) : (
              <Button kind="secondary" onClick={togglePause}>
                Pause
              </Button>
            )}
            <Button kind="primary" onClick={restart}>
              Restart
            </Button>
          </Actions>
        }
      >
        {status === 'paused' && <Tag accent>Paused</Tag>}
        {status === 'over' && <Tag>Game over</Tag>}
        <div
          role="group"
          aria-label={`Tetris board, ${COLS} columns by ${ROWS} rows`}
          style={BOARD_STYLE}
        >
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
                    ...CELL_STYLE,
                    background: isBlock ? PIECE_COLOR : undefined,
                  }}
                />
              )
            }),
          )}
        </div>
        {status === 'over' && (
          <EmptyState
            mono="Game over"
            title="Game over"
            detail={`Final score ${board.score}. Press Play again to restart.`}
          >
            <Actions>
              <Button kind="primary" onClick={restart}>
                Play again
              </Button>
            </Actions>
          </EmptyState>
        )}
      </Card>
    </AppShell>
  )
}
