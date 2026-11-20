import { CSSProperties, useEffect, useState } from 'react'
import { Body, Button, Card, Kpi, Stack } from '@lacuna/ui'
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

const cellStyle: CSSProperties = {
  width: 'calc(40px * var(--sf))',
  height: 'calc(40px * var(--sf))',
  borderRadius: '50%',
  border: 'calc(1px * var(--sf)) solid var(--soft)',
  background: 'var(--ui-bright)',
}

const discStyle: Record<Player, CSSProperties> = {
  1: { color: 'rgb(189, 72, 44)' },
  2: { color: 'rgb(56, 110, 178)' },
}

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
    <main>
      <Card mono="Game" title="Connect Four">
        <Stack>
          <h1 style={{ margin: 0, fontFamily: 'var(--serif)', fontSize: 'calc(26px * var(--tf))', color: 'var(--ink)' }}>Connect Four</h1>
          <Body>Drop discs into a column. Four in a row, column, or diagonal wins the game.</Body>
          <div style={{ textAlign: 'center' }} aria-live="polite">
            <Kpi
              value={status === 'playing' ? `Player ${player}'s turn` : status === 'won' ? `Player ${winner} wins` : 'Draw'}
              label="Status"
              accent={status === 'won'}
            />
            <Kpi value={`Score: ${score}`} label="Best score" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${COLS}, auto)`, gap: 'calc(8px * var(--sf))', justifyItems: 'center' }}>
            {Array.from({ length: ROWS }, (_, r) =>
              Array.from({ length: COLS }, (_, c) => (
                <span
                  key={`${r}-${c}`}
                  className={board[r][c] ? 'disc' : undefined}
                  style={board[r][c] ? { ...cellStyle, background: 'currentColor', borderColor: 'transparent', ...discStyle[board[r][c]] } : cellStyle}
                />
              )),
            )}
          </div>
          {status === 'playing' ? (
            <Stack>
              {Array.from({ length: COLS }, (_, i) => (
                <Button key={i + 1} kind="primary" onClick={() => drop(i)}>
                  Drop in column {i + 1}
                </Button>
              ))}
            </Stack>
          ) : (
            <Stack>
              <Button kind="primary" onClick={restart}>
                Restart
              </Button>
              <Button onClick={newGame}>New game</Button>
            </Stack>
          )}
        </Stack>
      </Card>
    </main>
  )
}
