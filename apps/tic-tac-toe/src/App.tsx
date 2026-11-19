import { useEffect, useState } from 'react'
import { Button, Card, Stack } from '@lacuna/ui'
import { clearStorage, emptyBoard, loadGame, saveGame } from './host'
import type { GameState, Mark } from './host'
import './app.css'

const TOP_LEFT = 0
const CENTER = 4
const BOTTOM_RIGHT = 8

function winnerOf(board: (Mark | null)[]): Mark | 'draw' | null {
  for (const mark of ['X', 'O'] as Mark[]) {
    if (board[TOP_LEFT] === mark && board[BOTTOM_RIGHT] === mark && board[CENTER] !== mark) return mark
  }
  return board.every((cell) => cell !== null) ? 'draw' : null
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

  const rows = [0, 1, 2].map((row) => (
    <tr key={row} className="ttt-row">
      {[0, 1, 2].map((column) => {
        const index = row * 3 + column
        const cell = game.board[index]
        const pos = `row ${row + 1}, column ${column + 1}`
        const label = cell ? `${cell}, ${pos}` : `empty, ${pos}`
        const onKeyDown = (event: React.KeyboardEvent<HTMLTableCellElement>) => {
          if (event.key === String(index + 1)) {
            event.preventDefault()
            play(index)
          }
        }
        return (
          <td key={index} className="ttt-td" role="cell" aria-label={label} tabIndex={0} onKeyDown={onKeyDown}>
            {cell ? (
              <span className="ttt-cell ttt-cell-filled" aria-label={label}>
                <span className="ttt-mark">{cell}</span>
              </span>
            ) : (
              <button
                type="button"
                className="ttt-cell"
                aria-label={`Player ${game.turn} to play in ${pos}`}
                onClick={() => play(index)}
              />
            )}
          </td>
        )
      })}
    </tr>
  ))

  return (
    <main>
      <Card mono="Game">
        <Stack>
          <h1 className="ttt-title">Tic Tac Toe</h1>
          <div className="ttt-status">
            {status}
            <br />
            X: {game.score.x}, O: {game.score.o}, Draws: {game.score.draws}
          </div>
          <table className="ttt-grid" aria-label="Tic tac toe board">
            <tbody>{rows}</tbody>
          </table>
          <Stack>
            <Button kind="primary" onClick={restart}>
              Restart
            </Button>
            <Button onClick={resetScores}>Reset Scores</Button>
          </Stack>
        </Stack>
      </Card>
    </main>
  )
}
