import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { openFile, saveJSON } from '@lacuna/file-save-open'
import {
  AppShell,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Keys,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
} from '@lacuna/ui'
import {
  applyMove,
  computerReply,
  host,
  initialState,
  legalMoves,
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

function moveText(m: { from: number; to: number }, color: Color) {
  const piece = color === 'white' ? 'White' : 'Black'
  return `${piece} ${squareName(m.from)}–${squareName(m.to)}`
}

// Roving-focus 2D grid built for chess: the @lacuna/board-grid module keeps
// the whole grid at tabIndex 0 and only lets the browser focus it, which
// breaks the "click a cell, then drive it with the arrow keys" contract the
// acceptance tests encode. This local grid gives every cell its own
// tabindex (-1 until it becomes the roving target) and mirrors the same
// arrow/Enter semantics the tests and the module agree on.
const CELL_BASE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'calc(40px * var(--sf))',
  height: 'calc(40px * var(--sf))',
  boxSizing: 'border-box',
  border: 'calc(1px * var(--sf)) solid var(--hair)',
  borderRadius: 'calc(6px * var(--sf))',
  background: 'var(--paper)',
  color: 'var(--ink)',
  cursor: 'pointer',
  userSelect: 'none',
  outline: 'none',
}

interface ChessBoardProps {
  rows: number
  cols: number
  cells: ReactNode[][]
  ariaLabel?: string
  cellAriaLabel?: (row: number, col: number) => string
  onCellActivate?: (row: number, col: number) => void
  cellSelected?: (row: number, col: number) => boolean
}

function ChessBoard(props: ChessBoardProps) {
  const { rows, cols, cells, ariaLabel, cellAriaLabel, onCellActivate, cellSelected } = props
  const cellRefs = useRef<Array<HTMLDivElement | null>>([])
  const [focusIndex, setFocusIndex] = useState<number | null>(null)

  useEffect(() => {
    cellRefs.current = cellRefs.current.slice(0, rows * cols)
  }, [rows, cols])

  const moveFocus = (row: number, col: number) => {
    const index = row * cols + col
    setFocusIndex(index)
    cellRefs.current[index]?.focus()
  }

  const onGridKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const key = event.key
    const isArrow =
      key === 'ArrowRight' || key === 'ArrowLeft' || key === 'ArrowDown' || key === 'ArrowUp'
    if (focusIndex === null) {
      if (!isArrow) return
      event.preventDefault()
      if (key === 'ArrowRight') moveFocus(0, Math.min(1, cols - 1))
      else if (key === 'ArrowDown') moveFocus(Math.min(1, rows - 1), 0)
      else moveFocus(0, 0)
      return
    }
    const row = Math.floor(focusIndex / cols)
    const col = focusIndex % cols
    switch (key) {
      case 'ArrowRight':
        event.preventDefault()
        if (col < cols - 1) moveFocus(row, col + 1)
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (col > 0) moveFocus(row, col - 1)
        break
      case 'ArrowDown':
        event.preventDefault()
        if (row < rows - 1) moveFocus(row + 1, col)
        break
      case 'ArrowUp':
        event.preventDefault()
        if (row > 0) moveFocus(row - 1, col)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onCellActivate?.(row, col)
        break
    }
  }

  return (
    <div
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={rows}
      aria-colcount={cols}
      tabIndex={-1}
      onKeyDown={onGridKeyDown}
      style={{
        display: 'grid',
        gap: 'calc(4px * var(--sf))',
        fontFamily: 'var(--sans)',
        fontSize: 'calc(14px * var(--tf))',
        color: 'var(--ink)',
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        border: 'calc(1px * var(--sf)) solid var(--hair)',
        borderRadius: 'calc(8px * var(--sf))',
        padding: 'calc(8px * var(--sf))',
        background: 'var(--paper-deep)',
        outline: 'none',
      }}
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={`row-${row}`} role="row" style={{ display: 'contents' }}>
          {Array.from({ length: cols }, (_, col) => {
            const index = row * cols + col
            const content = cells[row]?.[col] ?? null
            const label = cellAriaLabel ? cellAriaLabel(row, col) : undefined
            const isSelected = cellSelected ? cellSelected(row, col) : false
            return (
              <div
                key={`cell-${index}`}
                role="gridcell"
                aria-label={label}
                aria-rowindex={row + 1}
                aria-colindex={col + 1}
                className={isSelected ? 'selected' : undefined}
                ref={(el) => {
                  cellRefs.current[index] = el
                }}
                tabIndex={focusIndex === index ? 0 : -1}
                onClick={() => {
                  setFocusIndex(index)
                  onCellActivate?.(row, col)
                }}
                onFocus={() => {
                  setFocusIndex(index)
                }}
                style={{
                  ...CELL_BASE,
                  ...(focusIndex === index
                    ? {
      outline: 'calc(2px * var(--sf)) solid var(--accent)',
      outlineOffset: 'var(--sf)',
                      }
                    : null),
                }}
              >
                {content}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

type View = 'board' | 'moves' | 'share'

export function App() {
  const [game, setGame] = useState<GameState>(() => host.loadState() ?? initialState())
  const [selected, setSelected] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View>('board')
  const timers = useRef<number[]>([])
  const fileInput = useRef<HTMLInputElement | null>(null)

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
    setError(null)
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
      // A keyboard arrow can land the focus on an occupied square before any
      // click has happened; select the piece under the cursor so Enter can
      // commit its natural advance from there.
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
    if (piece && piece.color === game.turn) setSelected(index)
    else if (!viaKeyboard) setSelected(null)
  }



  const newGame = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
    setGame({ ...initialState(), mode: game.mode })
    setSelected(null)
    setError(null)
  }

  const revertMove = (move: { from: number; to: number }) => {
    setGame((current) => {
      const history = current.history.slice()
      const last = history[history.length - 1]
      if (!last || last.from !== move.from || last.to !== move.to) return current
      history.pop()
      const board = current.board.slice()
      board[move.from] = board[move.to]
      board[move.to] = null
      return { ...current, board, history, turn: current.turn === 'white' ? 'black' : 'white' }
    })
    setSelected(null)
    setError(null)
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
    setError(null)
  }

  const exportPosition = () => {
    saveJSON(game, { filename: 'chess-position.json' })
    setError(null)
  }

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const result = await openFile(file, 'json')
    if (!result.ok) {
      setError(`Could not read that file: ${result.error}`)
      return
    }
    const data = result.data as Partial<GameState> | null
    if (
      !data ||
      !Array.isArray(data.board) ||
      data.board.length !== 64 ||
      (data.turn !== 'white' && data.turn !== 'black') ||
      (data.mode !== 'local' && data.mode !== 'computer') ||
      !Array.isArray(data.history)
    ) {
      setError('That file is not a chess position.')
      return
    }
    setGame({
      board: data.board,
      turn: data.turn,
      mode: data.mode,
      history: data.history.filter((m) => typeof m?.from === 'number' && typeof m?.to === 'number'),
    })
    setSelected(null)
    setError(null)
  }

  const makeCell = (row: number, col: number): ReactNode => {
    // Standard orientation: a8 is top-left, a1 is bottom-left.
    const index = (7 - row) * 8 + col
    const piece = game.board[index]
    const name = squareName(index)
    const dark = (row + col) % 2 === 1
  const isSelected = selected === index
  const bg = isSelected
    ? 'var(--accent)'
    : dark
      ? 'var(--ink)'
      : 'var(--ui-bg)'
  return (
    <span className="chess-cell" style={{ background: bg }}>
      {piece ? <span aria-hidden="true">{GLYPHS[pieceLabel(piece)]}</span> : null}
      {piece ? <span className="chess-sr">{pieceLabel(piece)}</span> : null}
    </span>
  )
}

  const boardGrid: ReactNode[][] = []
  for (let row = 0; row < 8; row++) {
    const line: ReactNode[] = []
    for (let col = 0; col < 8; col++) line.push(makeCell(row, col))
    boardGrid.push(line)
  }

  const logEntries: ReactNode[] = []
  for (let i = 0; i < game.history.length; i += 2) {
    const first = game.history[i]
    const second = game.history[i + 1]
    const isLastPair = game.history.length - i <= 2
    logEntries.push(
      <Row
        key={i}
        title={`${i / 2 + 1}.`}
        meta={`${moveText(first, 'white')}${second ? ` · ${moveText(second, 'black')}` : ''}`}
        action={
          isLastPair ? (
            <Button kind="ghost" ariaLabel={`Remove ${moveText(first, 'white')}`} onClick={() => revertMove(first)}>
              Remove
            </Button>
          ) : undefined
        }
      />,
    )
  }

  return (
    <AppShell
      name="Chess Board Game"
      icon="grid"
      hue="cobalt"
      category="Personal"
      meta={`${game.history.length} moves`}
      status={error ?? 'Position saved on this device'}
      side={
        <Rail
          title="Chess Board Game"
          note="One board · local"
          chips={['Click or keys', 'Works offline']}
        >
          <KpiRow>
            <Kpi value={status} label="Turn" accent />
            <Kpi value={game.mode === 'computer' ? 'Computer' : 'Local'} label="Mode" />
            <Kpi value={game.history.length} label="Moves" />
          </KpiRow>
          <Keys
            items={[
              ['← → ↑ ↓', 'Move focus'],
              ['Enter', 'Select · move'],
            ]}
          />
          <div className="chess-views" style={{ marginTop: 'calc(14px * var(--sf))' }}>
            <Button
              kind={view === 'board' ? 'primary' : 'secondary'}
              onClick={() => setView('board')}
            >
              Board
            </Button>
            <Button
              kind={view === 'moves' ? 'primary' : 'secondary'}
              onClick={() => setView('moves')}
            >
              Moves
            </Button>
            <Button kind={view === 'share' ? 'primary' : 'secondary'} onClick={() => setView('share')}>
              Share
            </Button>
          </div>
        </Rail>
      }
    >
      {view === 'board' ? (
        <Card
          mono="Board"
          title="Chess board"
          actions={
            <>
              <Button kind="primary" onClick={newGame}>
                New Game
              </Button>
              <Button onClick={undo} disabled={game.history.length === 0}>
                Undo
              </Button>
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
          <div className="chess-board">
              <ChessBoard
              rows={8}
              cols={8}
              cells={boardGrid}
              ariaLabel="Chess board"
              cellAriaLabel={(row, col) => squareName((7 - row) * 8 + col)}
              onCellActivate={(row, col) => select((7 - row) * 8 + col, true)}
              cellSelected={(row, col) => selected === (7 - row) * 8 + col}
            />
          </div>
        </Card>
      ) : view === 'moves' ? (
        <Card mono="Moves" title="Game log" flush>
          {game.history.length === 0 ? (
            <EmptyState
              mono="Moves"
              title="No moves yet"
              detail="Move a piece on the board to start the log. Undo clears one reply at a time."
            />
          ) : (
            <List label="Move history">{logEntries}</List>
          )}
        </Card>
      ) : (
        <Card mono="Share" title="Position file">
          <EmptyState
            mono="Export"
            title="Carry this position anywhere"
            detail="Save the board, turn, mode and move list as a file, or open one to resume a game on another device."
          />
          <div className="chess-views">
            <Button onClick={exportPosition}>Save position</Button>
            <Button onClick={() => fileInput.current?.click()}>Open position</Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => void onImportFile(e)}
            />
          </div>
          {error != null && (
            <ErrorState mono="Import" title="That file could not be opened" detail={error} />
          )}
        </Card>
      )}
    </AppShell>
  )
}
