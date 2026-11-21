import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { Actions, AppShell, Button, Card, Rail } from '@lacuna/ui'
import { clearStorage, emptyBoard, loadGame, saveGame } from './host'
import type { GameState, Mark } from './host'

const TOP_LEFT = 0
const CENTER = 4
const BOTTOM_RIGHT = 8

function winnerOf(board: (Mark | null)[]): Mark | 'draw' | null {
  for (const mark of ['X', 'O'] as Mark[]) {
    if (board[TOP_LEFT] === mark && board[BOTTOM_RIGHT] === mark && board[CENTER] !== mark) return mark
  }
  return board.every((cell) => cell !== null) ? 'draw' : null
}

const boardStyle: CSSProperties = {
  display: 'table',
  borderCollapse: 'separate',
  borderSpacing: 'calc(4px * var(--sf))',
}

const rowStyle: CSSProperties = {
  display: 'table-row',
}

const cellStyle: CSSProperties = {
  display: 'table-cell',
  textAlign: 'center',
  width: 'calc(64px * var(--sf))',
  height: 'calc(56px * var(--sf))',
  boxSizing: 'border-box',
  border: 'calc(1px * var(--sf)) solid var(--ui-line2)',
  borderRadius: 'calc(2px * var(--sf))',
  background: 'var(--ui-card)',
  color: 'var(--ink)',
  fontFamily: 'var(--serif)',
  fontSize: 'calc(22px * var(--tf))',
  verticalAlign: 'middle',
}

const filledStyle: CSSProperties = {
  background: 'var(--paper-deep)',
}

const buttonStyle: CSSProperties = {
  all: 'unset',
  boxSizing: 'border-box',
  width: '100%',
  height: '100%',
  cursor: 'pointer',
}

const statusStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
}

const statusTextStyle: CSSProperties = {
  fontFamily: 'var(--serif)',
  fontSize: 'calc(18px * var(--tf))',
  fontWeight: 600,
}

const scoreStyle: CSSProperties = {
  fontFamily: 'var(--mono)',
  fontSize: 'calc(12px * var(--tf))',
  color: 'var(--ink-80)',
}

export function App() {
  const [game, setGame] = useState<GameState>(() => loadGame())

  useEffect(() => {
    saveGame(game)
  }, [game])

  const play = (index: number) => {
    setGame((current) => {
      if (current.winner || current.board[index]) return current
      const board = [...current.board]
      board[index] = current.turn
      const winner = winnerOf(board)
      const score = { ...current.score }
      if (winner === 'X') score.x += 1
      else if (winner === 'O') score.o += 1
      else if (winner === 'draw') score.draws += 1
      return { board, turn: current.turn === 'X' ? 'O' : 'X', score, winner }
    })
  }

  const restart = () => {
    setGame((current) => ({ board: emptyBoard(), turn: 'X', score: current.score, winner: null }))
  }

  const resetScores = () => {
    clearStorage()
    setGame({ board: emptyBoard(), turn: 'X', score: { x: 0, o: 0, draws: 0 }, winner: null })
  }

  const status =
    game.winner === 'X'
      ? 'Player X wins'
      : game.winner === 'O'
        ? 'Player O wins'
        : game.winner === 'draw'
          ? 'Draw'
          : `Player ${game.turn}'s turn`

  return (
    <AppShell
      name="Tic Tac Toe"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta="3x3"
      side={
        <Rail
          title="Tic Tac Toe"
          note="Two players · local"
          chips={['3x3 grid', 'Numbers 1-9 aim a cell', 'Score keeps across reloads']}
        />
      }
    >
      <Card mono="Game" title="Board">
        <div
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'calc(16px * var(--tf))',
            color: game.winner !== null ? 'var(--accent)' : 'var(--ink)',
          }}
        >
          {status}
          <br />
          <span style={scoreStyle}>
            X: {game.score.x}, O: {game.score.o}, Draws: {game.score.draws}
          </span>
        </div>
        <table style={boardStyle} aria-label="Tic tac toe board">
          <tbody>
            {[0, 1, 2].map((row) => (
              <tr key={row} style={rowStyle}>
                {[0, 1, 2].map((column) => {
                  const index = row * 3 + column
                  const mark = game.board[index]
                  const pos = `row ${row + 1}, column ${column + 1}`
                  const cellLabel = mark ? `${mark}, ${pos}` : `empty, ${pos}`
                  const onKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
                    if (event.key === String(index + 1)) {
                      event.preventDefault()
                      play(index)
                    }
                  }
                  return (
                    <td
                      key={index}
                      role="cell"
                      aria-label={cellLabel}
                      tabIndex={0}
                      onKeyDown={onKeyDown}
                      style={mark ? { ...cellStyle, ...filledStyle } : cellStyle}
                    >
                      {mark ? (
                        mark
                      ) : (
                        <button
                          type="button"
                          aria-label={`Player ${game.turn} to play in ${pos}`}
                          onClick={() => play(index)}
                          style={buttonStyle}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <Actions>
          <Button kind="primary" onClick={restart}>
            Restart
          </Button>
          <Button onClick={resetScores}>Reset Scores</Button>
        </Actions>
      </Card>
    </AppShell>
  )
}
