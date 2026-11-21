import { useEffect, useState } from 'react'
import { Actions, AppShell, Board, Body, Button, Card, Keys, Kpi, KpiRow, Rail, Tag } from '@lacuna/ui'
import { DISC_1, DISC_2 } from './colors'
import { host } from './host'

const COLS = 7
const ROWS = 6

type Player = 1 | 2
type Cell = Player | 0
type Status = 'playing' | 'won' | 'draw'

const EMPTY = (): Cell[][] => Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(0))

function findWin(board: Cell[][]): Player | 0 {
  const dirs = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ]
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c]
      if (!v) continue
      for (const [dr, dc] of dirs) {
        let n = 1
        while (n < 4 && r + dr * n >= 0 && r + dr * n < ROWS && c + dc * n >= 0 && c + dc * n < COLS && board[r + dr * n][c + dc * n] === v) n++
        if (n === 4) return v
      }
    }
  }
  return 0
}

const piece = (v: Cell) => (v === 1 ? DISC_1 : v === 2 ? DISC_2 : 'transparent')

export function App() {
  const [board, setBoard] = useState<Cell[][]>(EMPTY)
  const [player, setPlayer] = useState<Player>(1)
  const [status, setStatus] = useState<Status>('playing')
  const [winner, setWinner] = useState<Player | 0>(0)
  const [score, setScore] = useState(0)

  useEffect(() => {
    setScore(host.readScore())
  }, [])

  const drop = (col: number) => {
    if (status !== 'playing') return
    let row = -1
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === 0) {
        row = r
        break
      }
    }
    if (row === -1) return
    const next = board.map((line) => [...line])
    next[row][col] = player
    setBoard(next)
    const win = findWin(next)
    if (win) {
      setStatus('won')
      setWinner(win)
      const value = player === 1 ? score + 1 : score
      setScore(value)
      host.writeScore(value)
      return
    }
    if (next.every((line) => line.every((cell) => cell !== 0))) {
      setStatus('draw')
      return
    }
    setPlayer(player === 1 ? 2 : 1)
  }

  const restart = () => {
    setBoard(EMPTY())
    setPlayer(1)
    setStatus('playing')
    setWinner(0)
  }

  const newGame = () => {
    restart()
    setScore(0)
    host.writeScore(0)
  }

  return (
    <AppShell
      name="Connect Four"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`Score: ${score}`}
      side={
        <Rail title="Connect Four" note="7 by 6 grid · local" chips={['4 in a row', 'Works offline']}>
          <KpiRow>
            <Kpi value={String(score)} label="Score" accent />
          </KpiRow>
          <div>
            <Body sm>Next: {status === 'playing' ? `Player ${player}` : status === 'won' ? `Player ${winner}` : '—'}</Body>
            <Board cols={COLS} rows={ROWS} cell={18} label="Board preview">
              {board.map((line, r) =>
                line.map((cell, c) => (
                  <div key={`${r}-${c}`} style={{ background: piece(cell) }} />
                )),
              )}
            </Board>
          </div>
          <Keys items={[['1-7', 'Drop in a column'], ['R', 'Restart']]} />
        </Rail>
      }
    >
      <Card
        mono="Game"
        title="Board"
        actions={
          status === 'playing' ? (
            <Actions>
              {Array.from({ length: COLS }, (_, i) => (
                <Button key={i + 1} onClick={() => drop(i)}>Drop in column {i + 1}</Button>
              ))}
            </Actions>
          ) : (
            <Actions>
              <Button kind="primary" onClick={restart}>Restart</Button>
              <Button onClick={newGame}>New game</Button>
            </Actions>
          )
        }
      >
        <div>
          {status === 'playing' ? <Body>Player {player}'s turn</Body> : status === 'won' ? <Tag accent>Player {winner} wins</Tag> : <Tag accent>Draw</Tag>}
        </div>
        <Board cols={COLS} rows={ROWS} cell={40} label="Connect Four board">
          {board.map((line, r) =>
            line.map((cell, c) => (
              <div key={`${r}-${c}`} data-row={r} data-col={c} data-piece={cell} style={{ background: piece(cell) }} />
            )),
          )}
        </Board>
      </Card>
    </AppShell>
  )
}
