import { useEffect, useRef, useState } from 'react'
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

type BoardStatus = 'playing' | 'paused' | 'over'

type GameHandler = {
  moveLeft(): void
  moveRight(): void
  rotate(): void
  softDrop(): void
  togglePause(): void
}

let gameHandler: GameHandler | null = null

function handleKey(event: KeyboardEvent) {
  if (!gameHandler) return
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) return
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault()
      gameHandler.moveLeft()
      break
    case 'ArrowRight':
      event.preventDefault()
      gameHandler.moveRight()
      break
    case 'ArrowUp':
      event.preventDefault()
      gameHandler.rotate()
      break
    case 'ArrowDown':
      event.preventDefault()
      gameHandler.softDrop()
      break
    case 'Escape':
      event.preventDefault()
      gameHandler.togglePause()
      break
  }
}

window.addEventListener('keydown', handleKey)

function levelFor(score: number): number {
  return Math.floor(score / 1000) + 1
}

const KEYS: [string, string][] = [
  ['←', 'Move left'],
  ['→', 'Move right'],
  ['↑', 'Rotate'],
  ['↓', 'Soft drop'],
  ['Esc', 'Pause'],
]

export function App() {
  const [board, setBoard] = useState<Board>(() => newGame(host.loadGame().best))
  const [status, setStatus] = useState<BoardStatus>('playing')
  const [linesCleared, setLinesCleared] = useState(0)
  const bestRef = useRef<number>(board.best)

  const applyBoard = (
    fn: (b: Board) => { board: Board; over?: boolean; cleared?: number },
  ) => {
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
  }

  const moveLeft = () => {
    if (status !== 'playing') return
    applyBoard((prev) => {
      const piece = tryMove(prev.grid, prev.piece, -1, 0)
      if (!piece) return { board: prev }
      return { board: { ...prev, piece } }
    })
  }

  const moveRight = () => {
    if (status !== 'playing') return
    applyBoard((prev) => {
      const piece = tryMove(prev.grid, prev.piece, 1, 0)
      if (!piece) return { board: prev }
      return { board: { ...prev, piece } }
    })
  }

  const rotate = () => {
    if (status !== 'playing') return
    applyBoard((prev) => {
      const piece = tryRotate(prev.grid, prev.piece)
      if (!piece) return { board: prev }
      return { board: { ...prev, piece } }
    })
  }

  const softDrop = () => {
    if (status !== 'playing') return
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
  }

  const togglePause = () => {
    if (status === 'over') return
    setStatus((s) => (s === 'playing' ? 'paused' : 'playing'))
  }

  const restart = () => {
    const best = bestRef.current
    host.resetScore()
    setBoard(newGame(best))
    setLinesCleared(0)
    setStatus('playing')
  }

  gameHandler = { moveLeft, moveRight, rotate, softDrop, togglePause }

  useEffect(() => () => {
    gameHandler = null
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

  const nextCells = new Set<number>()
  for (const [cx, cy] of board.piece.cells) {
    nextCells.add(cy * 4 + cx)
  }

  return (
    <AppShell
      name="Classic Tetris"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta="10×20 field"
      status={`Score: ${board.score} · Best: ${board.best}`}
      side={
        <Rail
          title={status === 'over' ? 'Game over' : 'Score'}
          note={status === 'over' ? 'Restart to play again' : 'Keyboard'}
          chips={status === 'over' ? undefined : ['← → move', '↑ rotate', '↓ drop']}
        >
          <KpiRow>
            <Kpi value={String(board.score)} label="Score" accent />
            <Kpi value={String(board.best)} label="Best" />
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
              const isNext = nextCells.has(i)
              return (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    width: 'calc(14px * var(--sf))',
                    height: 'calc(14px * var(--sf))',
                    borderRadius: 'calc(2px * var(--sf))',
                    background: isNext ? 'var(--accent)' : undefined,
                  }}
                />
              )
            })}
          </div>
          <SectionLabel>Keys</SectionLabel>
          <div
            role="group"
            aria-label="Keyboard controls"
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: 'calc(4px * var(--sf)) calc(8px * var(--sf))',
            }}
          >
            {KEYS.map(([key, desc]) => (
              <div key={key} style={{ display: 'contents' }}>
                <span
                  aria-label={key}
                  style={{
                    fontFamily: 'var(--mono)',
                    fontSize: 'calc(12px * var(--tf))',
                    color: 'var(--ink-60)',
                    border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
                    borderRadius: 'calc(2px * var(--sf))',
                    padding: 'calc(2px * var(--sf)) calc(4px * var(--sf))',
                    textAlign: 'center',
                    minWidth: 'calc(24px * var(--sf))',
                    display: 'inline-block',
                  }}
                >
                  {key}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'calc(12px * var(--tf))',
                    color: 'var(--ink-60)',
                    lineHeight: 1.8,
                  }}
                >
                  {desc}
                </span>
              </div>
            ))}
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
                Resume
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
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gap: 'calc(2px * var(--sf))',
            border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
            borderRadius: 'calc(2px * var(--sf))',
            padding: 'calc(4px * var(--sf))',
            background: 'var(--paper-deep)',
          }}
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
                    aspectRatio: '1',
                    borderRadius: 'calc(2px * var(--sf))',
                    background: isBlock ? 'var(--ink)' : undefined,
                  }}
                />
              )
            }),
          )}
        </div>
        {status === 'paused' && (
          <EmptyState
            mono="Paused"
            title="Paused"
            detail="Press Resume to continue."
          />
        )}
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
