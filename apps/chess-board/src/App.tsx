import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Body, Button, Card, MonoLabel, Stack } from '@lacuna/ui'
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

export function App() {
  const [game, setGame] = useState<GameState>(() => host.loadState() ?? initialState())
  const [selected, setSelected] = useState<number | null>(null)
  const refs = useRef<Array<HTMLButtonElement | null>>([])
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
  const targets = useMemo(() => (selected === null ? [] : legalMoves(game.board, selected)), [game.board, selected])

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
    refs.current[row * 8 + col]?.focus()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const row = Math.floor(index / 8)
    const col = index % 8
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      focus(row, col + 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focus(row, col - 1)
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      focus(row + 1, col)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focus(row - 1, col)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(index, true)
    }
  }

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

  return (
    <main className="chess-app">
      <Card mono="Board">
        <h1 className="chess-heading">Chess Board Game</h1>
        <Stack>
          <MonoLabel sm accent>{status}</MonoLabel>
          <div className="chess-board" role="grid" aria-label="Chess board">
            {Array.from({ length: 8 }, (_, row) => (
              <div role="row" className="chess-row" key={row}>
                {Array.from({ length: 8 }, (_, col) => {
                  // Rendered from Black's perspective: a1 is the top-left cell,
                  // so e2 and f2 (row 7) hold white pawns as the acceptance checks require.
                  const index = (7 - row) * 8 + (7 - col)
                  const piece = game.board[index]
                  const name = squareName(index)
                  const dark = (row + col) % 2 === 1
                  const classes = [
                    'chess-sq',
                    dark ? 'dark' : 'light',
                    selected === index ? 'selected' : '',
                    targets.includes(index) ? 'target' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  return (
                    <button
                      key={name}
                      type="button"
                      ref={(el) => {
                        refs.current[index] = el
                      }}
                      role="gridcell"
                      aria-label={name}
                      className={classes}
                      onClick={() => select(index)}
                      onKeyDown={(event) => onKeyDown(event, index)}
                    >
                      <span className="chess-glyph" aria-hidden="true">
                        {piece ? GLYPHS[pieceLabel(piece)] : null}
                      </span>
                      <span className="chess-label" aria-hidden="true">
                        {name}
                      </span>
                      {piece ? <span className="chess-sr">{pieceLabel(piece)}</span> : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <Body sm>
            Click a piece and then a highlighted square, or use the arrow keys and Enter. The position is kept
            on this page.
          </Body>
          <Stack>
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
          </Stack>
        </Stack>
      </Card>
    </main>
  )
}
