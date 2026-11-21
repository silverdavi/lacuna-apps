import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AppShell, Button, Card, Keys, Kpi, KpiRow, Rail } from '@lacuna/ui'
import {
  computerReply,
  host,
  initialState,
  legalMoves,
  applyMove,
  squareName,
  type Color,
  type GameState,
  type Piece,
} from './host'
import './app.css'

const GLYPHS: Record<string, string> = {
  'white pawn': '♙',
  'white rook': '♖',
  'white knight': '♘',
  'white bishop': '♗',
  'white queen': '♕',
  'white king': '♔',
  'black pawn': '♟',
  'black rook': '♜',
  'black knight': '♞',
  'black bishop': '♝',
  'black queen': '♛',
  'black king': '♚',
}

const pieceLabel = (piece: Piece) => `${piece.color} ${piece.type}`

// The furthest forward square a piece can reach in a single keyboard
// "commit" press: a pawn on its start row with both steps clear advances two,
// a pawn with one clear step advances one, otherwise null.
const naturalAdvance = (board: (Piece | null)[], index: number): number | null => {
  const piece = board[index]
  if (!piece || piece.type !== 'pawn') return null
  const moves = legalMoves(board, index)
  const row = Math.floor(index / 8)
  const dir = piece.color === 'white' ? -1 : 1
  const two = (row + 2 * dir) * 8 + (index % 8)
  if (moves.includes(two)) return two
  const one = (row + dir) * 8 + (index % 8)
  if (moves.includes(one)) return one
  return null
}

let onBoardKey: ((row: number, col: number, key: string) => void) | null = null

window.addEventListener('keydown', (event) => {
  const el = event.target
  if (!(el instanceof HTMLElement)) return
  if (!el.closest?.('.chess-board-grid')) return
  const row = Number(el.dataset.boardRow)
  const col = Number(el.dataset.boardCol)
  if (Number.isNaN(row) || Number.isNaN(col)) return
  const key = event.key
  if (
    key === 'ArrowRight' ||
    key === 'ArrowLeft' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Enter' ||
    key === ' '
  ) {
    event.preventDefault()
    onBoardKey?.(row, col, key)
  }
})

export function App() {
  const [game, setGame] = useState<GameState>(() => host.loadState() ?? initialState())
  const [selected, setSelected] = useState<number | null>(null)
  const refs = useRef<Array<HTMLDivElement | null>>([])
  const timers = useRef<number[]>([])

  useEffect(() => {
    host.saveState(game)
  }, [game])

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  const status = game.turn === 'white' ? 'White to move' : 'Black to move'
  const targets = useMemo(
    () => (selected === null ? [] : legalMoves(game.board, selected)),
    [game.board, selected],
  )

  const makeMove = (from: number, to: number) => {
    if (!legalMoves(game.board, from).includes(to)) return
    const board = applyMove(game.board, from, to)
    const turn: Color = game.turn === 'white' ? 'black' : 'white'
    setGame({ ...game, board, turn, history: [...game.history, { from, to }] })
    setSelected(null)
    if (game.mode === 'computer' && turn === 'black') {
      const id = window.setTimeout(() => {
        setGame((current) => {
          if (current.turn !== 'black') return current
          const reply = computerReply(current.board, 'black')
          if (!reply) return current
          const nextBoard = applyMove(current.board, reply.from, reply.to)
          return {
            ...current,
            board: nextBoard,
            turn: 'white' as Color,
            history: [...current.history, reply],
          }
        })
      }, 350)
      timers.current.push(id)
    }
  }

  const select = (index: number, viaKeyboard = false) => {
    const piece = game.board[index]
    if (selected === null) {
      if (piece && piece.color === game.turn) setSelected(index)
      return
    }
    if (index === selected) {
      // Re-activating the selected piece: a click toggles it off; a keyboard
      // Enter commits the natural forward advance (furthest clear step).
      if (viaKeyboard) {
        const adv = naturalAdvance(game.board, selected)
        if (adv !== null) {
          makeMove(selected, adv)
          return
        }
      }
      setSelected(null)
      return
    }
    const own = game.board[selected]
    if (own && own.color === game.turn && targets.includes(index)) {
      makeMove(selected, index)
      return
    }
    // The square is not a legal target, so nothing moves. A failed keyboard
    // move attempt keeps the current selection; a click on another own piece
    // reselects it, and a click on an enemy/empty square clears the selection.
    if (viaKeyboard) return
    if (piece && piece.color === game.turn) setSelected(index)
    else setSelected(null)
  }

  const focus = (row: number, col: number) => {
    if (row < 0 || row > 7 || col < 0 || col > 7) return
    const index = (7 - row) * 8 + col
    refs.current[index]?.focus()
  }

  const handleKey = (row: number, col: number, key: string) => {
    switch (key) {
      case 'ArrowRight':
        focus(row, col + 1)
        break
      case 'ArrowLeft':
        focus(row, col - 1)
        break
      case 'ArrowDown':
        focus(row + 1, col)
        break
      case 'ArrowUp':
        focus(row - 1, col)
        break
      case 'Enter':
      case ' ':
        select((7 - row) * 8 + col, true)
        break
    }
  }

  onBoardKey = handleKey

  const newGame = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    setGame({ ...initialState(), mode: game.mode })
    setSelected(null)
  }

  const undo = () => {
    const history = game.history.slice()
    let board = game.board.slice()
    let turn: Color = game.turn
    const steps = game.mode === 'computer' ? 2 : 1
    for (let i = 0; i < steps && history.length > 0; i++) {
      const move = history.pop()
      if (!move) break
      // Reverse the move: the piece at `to` returns to `from`.
      board[move.from] = board[move.to]
      board[move.to] = null
      turn = turn === 'white' ? 'black' : 'white'
    }
    if (history.length === game.history.length) return
    setGame({ ...game, board, turn, history })
    setSelected(null)
  }

  const makeCell = (row: number, col: number): ReactNode => {
    // Standard orientation: a8 is top-left, a1 is bottom-left.
    const index = (7 - row) * 8 + col
    const piece = game.board[index]
    const name = squareName(index)
    const dark = (row + col) % 2 === 1
    const isSelected = selected === index
    const isTarget = targets.includes(index)
    const bg = isSelected
      ? 'var(--accent)'
      : dark
        ? 'var(--ink)'
        : piece
          ? piece.color === 'white'
            ? 'var(--geo-comm)'
            : 'var(--geo-verm)'
          : 'var(--ui-bg)'
    return (
      <div
        key={name}
        role="gridcell"
        aria-label={name}
        tabIndex={0}
        data-board-row={row}
        data-board-col={col}
        className={isSelected ? 'selected' : ''}
        style={{ background: bg }}
        ref={(el) => {
          refs.current[index] = el
        }}
        onClick={() => select(index)}
      >
        {piece ? (
          <span aria-hidden="true">{GLYPHS[pieceLabel(piece)]}</span>
        ) : isTarget ? (
          <span
            aria-hidden="true"
            style={{
              width: 'calc(10px * var(--sf))',
              height: 'calc(10px * var(--sf))',
              borderRadius: '50%',
              border: 'calc(1px * var(--sf)) solid var(--accent)',
            }}
          />
        ) : null}
        {piece ? <span className="chess-sr">{pieceLabel(piece)}</span> : null}
      </div>
    )
  }

  const rows: ReactNode[] = []
  for (let row = 0; row < 8; row++) {
    const gridcells: ReactNode[] = []
    for (let col = 0; col < 8; col++) {
      gridcells.push(makeCell(row, col))
    }
    rows.push(
      <div key={`row-${row}`} role="row">
        {gridcells}
      </div>,
    )
  }

  return (
    <AppShell
      name="Chess Board Game"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta="8 × 8"
      status="Position saved on this device"
      side={
        <Rail
          title="Chess Board Game"
          note="One board · local"
          chips={['Click or keys', 'Works offline']}
        >
          <KpiRow>
            <Kpi value={status} label="Turn" accent />
            <Kpi value={game.mode === 'computer' ? 'Computer' : 'Local'} label="Mode" />
          </KpiRow>
          <Keys
            items={[
              ['← → ↑ ↓', 'Move focus'],
              ['Enter', 'Select · move'],
            ]}
          />
        </Rail>
      }
    >
      <Card
        mono="Board"
        title="Chess board"
        actions={
          <>
            <Button kind="primary" onClick={newGame}>
              New Game
            </Button>
            <Button onClick={undo}>Undo</Button>
            <Button
              onClick={() => {
                const next = game.mode === 'computer' ? 'local' : 'computer'
                setGame({ ...game, mode: next })
              }}
            >
              {game.mode === 'computer' ? 'Play vs Human' : 'Play vs Computer'}
            </Button>
          </>
        }
      >
        <div role="grid" aria-label="Chess board" className="chess-board-grid">
          {rows}
        </div>
      </Card>
    </AppShell>
  )
}
