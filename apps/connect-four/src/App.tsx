import { useEffect, useState } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  Divider,
  EmptyState,
  Keys,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Stack,
  Tag,
} from '@lacuna/ui'
import { Dialog } from '@lacuna/dialog'
import { useClipboard } from '@lacuna/use-clipboard'
import { useHotkeys } from '@lacuna/use-hotkeys'
import { DISC_1, DISC_2 } from './colors'
import { host } from './host'

const COLS = 7
const ROWS = 6
const TOTAL = COLS * ROWS

type Player = 1 | 2
type Cell = Player | 0
type Status = 'playing' | 'won' | 'draw'
type Tab = 'Board' | 'Log' | 'Help'

interface Finish {
  status: 'won' | 'draw'
  winner: Player | 0
  moves: number
}

interface Entry {
  move: number
  player: Player
  col: number
  row: number
  outcome?: 'won' | 'draw'
}

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

const piece = (v: Cell) => (v === 1 ? DISC_1 : v === 2 ? DISC_2 : 'var(--ink)')
const resultText = (status: Status, winner: Player | 0) =>
  status === 'playing' ? `Player ${winner || 1}'s turn` : status === 'won' ? `Player ${winner} wins` : 'Draw'

const emptyTitle = (status: Status, winner: Player | 0) =>
  status === 'won' ? `Player ${winner} made four in a row` : 'All 42 cells are full'

const boardRows = (board: Cell[][]) =>
  board.map((line) => line.map((cell) => (cell === 1 ? '1' : cell === 2 ? '2' : '.')).join(' ')).join('\n')

const exportText = (board: Cell[][], score: number, finish: Finish | null) =>
  [
    'Connect Four',
    `Score: ${score}`,
    finish ? `Last result: ${resultText(finish.status, finish.winner)} after ${finish.moves} moves` : 'Last result: none yet',
    '',
    boardRows(board),
  ].join('\n')

export function App() {
  const [board, setBoard] = useState<Cell[][]>(EMPTY)
  const [player, setPlayer] = useState<Player>(1)
  const [status, setStatus] = useState<Status>('playing')
  const [winner, setWinner] = useState<Player | 0>(0)
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(0)
  const [log, setLog] = useState<Entry[]>([])
  const [last, setLast] = useState<Finish | null>(null)
  const [tab, setTab] = useState<Tab>('Board')
  const [rulesOpen, setRulesOpen] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const { copied, copy } = useClipboard({
    timeoutMs: 1500,
    onError: () => setCopyError('Copy failed — the clipboard is not available here.'),
  })

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
    const move = moves + 1
    const entry: Entry = { move, player, col, row }
    setBoard(next)
    setLog([entry, ...log])
    setMoves(move)
    const win = findWin(next)
    if (win) {
      entry.outcome = 'won'
      setLog([entry, ...log])
      setStatus('won')
      setWinner(win)
      const value = player === 1 ? score + 1 : score
      setScore(value)
      host.writeScore(value)
      setLast({ status: 'won', winner: win, moves: move })
      setTab('Board')
      return
    }
    if (next.every((line) => line.every((cell) => cell !== 0))) {
      entry.outcome = 'draw'
      setLog([entry, ...log])
      setStatus('draw')
      setLast({ status: 'draw', winner: 0, moves: move })
      setTab('Board')
      return
    }
    setPlayer(player === 1 ? 2 : 1)
  }

  const restart = () => {
    setBoard(EMPTY())
    setPlayer(1)
    setStatus('playing')
    setWinner(0)
    setMoves(0)
    setLog([])
    setTab('Board')
  }

  const newGame = () => {
    restart()
    setScore(0)
    setLast(null)
    host.writeScore(0)
  }

  useHotkeys(
    [
      ...Array.from({ length: COLS }, (_, i) => ({
        keys: String(i + 1),
        handler: () => drop(i),
        description: `Drop in column ${i + 1}`,
      })),
      { keys: 'r', handler: restart, description: 'Restart' },
      { keys: 'n', handler: newGame, description: 'New game' },
    ],
    { enabled: !rulesOpen },
  )

  const onCopy = () => {
    setCopyError(null)
    void copy(exportText(board, score, last)).catch(() => setCopyError('Copy failed — the clipboard is not available here.'))
  }

  const playing = status === 'playing'

  const dropActions = (
    <Actions>
      {Array.from({ length: COLS }, (_, i) => (
        <Button key={i + 1} onClick={() => drop(i)} disabled={!playing}>
          Drop in column {i + 1}
        </Button>
      ))}
    </Actions>
  )

  const boardCard = (
    <Card
      mono="Game"
      title="Board"
      actions={
        playing ? (
          dropActions
        ) : (
          <Actions>
            <Button kind="primary" onClick={restart}>
              Restart
            </Button>
            <Button onClick={newGame}>New game</Button>
          </Actions>
        )
      }
    >
      <Stack>
        <div>
          <Tag accent>{playing ? `Player ${player}'s turn` : resultText(status, winner)}</Tag>
          <Tag>{`${moves} of ${TOTAL} discs`}</Tag>
        </div>
        <Board cols={COLS} rows={ROWS} cell={40} label="Connect Four board">
          {board.map((line, r) =>
            line.map((cell, c) => (
              <div key={`${r}-${c}`} data-row={r} data-col={c} data-piece={cell} style={{ background: piece(cell) }} />
            )),
          )}
        </Board>
        {playing && moves === 0 ? (
          <EmptyState
            mono="Empty"
            title="A fresh board"
            detail="Pick a column with the buttons above or press keys 1 to 7. First disc is Player 1."
          />
        ) : null}
        {!playing ? (
          <EmptyState
            mono="Result"
            title={emptyTitle(status, winner)}
            detail={
              status === 'won'
                ? `Player ${winner} connected four on move ${moves}. Press Restart to play again or New game to clear the score.`
                : `All ${TOTAL} discs are down with no line of four. Press Restart to play again.`
            }
          />
        ) : null}
        <Divider />
        <div>
          <Actions>
            <Button onClick={onCopy}>{copied ? 'Copied' : 'Copy board'}</Button>
            <Button ariaLabel="Show the rules" onClick={() => setRulesOpen(true)}>
              Rules
            </Button>
          </Actions>
          {copyError ? <EmptyState mono="Error" title="Could not copy" detail={copyError} /> : null}
        </div>
      </Stack>
    </Card>
  )

  const logCard = (
    <Card
      mono="Log"
      title="Move log"
      actions={
        <Actions>
          <Button onClick={() => setTab('Board')} disabled={!playing}>
            Back to board
          </Button>
        </Actions>
      }
    >
      {log.length === 0 ? (
        <EmptyState mono="Empty" title="No moves yet" detail="Discs you drop appear here, newest first." />
      ) : (
        <List label="Moves, newest first">
          {log.map((e) => (
            <Row
              key={e.move}
              title={`Move ${e.move}`}
              meta={`Player ${e.player} · column ${e.col}`}
              value={`Row ${ROWS - e.row}`}
              hot={e.outcome != null}
            />
          ))}
        </List>
      )}
    </Card>
  )

  const helpCard = (
    <Card mono="Help" title="How to play">
      <Stack>
        <p style={{ margin: 0 }}>
          Two players drop discs into a 7 by 6 grid. A disc falls to the lowest empty cell of its column.
        </p>
        <p style={{ margin: 0 }}>
          Connect four of your discs in a row — horizontally, vertically or diagonally — to win the game and add a
          point to the score.
        </p>
        <p style={{ margin: 0 }}>
          The score keeps the running total across reloads. Restart plays the next round keeping it; New game clears
          it back to zero.
        </p>
        <Divider />
        <Keys items={[['1-7', 'Drop in a column'], ['R', 'Restart'], ['N', 'New game']]} />
      </Stack>
    </Card>
  )

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
          <KpiRow>
            <Kpi value={String(moves)} label="Discs" />
            <Kpi value={playing ? `P${player}` : '—'} label="Turn" />
          </KpiRow>
          <Board cols={COLS} rows={ROWS} cell={18} label="Board preview">
            {board.map((line, r) =>
              line.map((cell, c) => (
                <div key={`${r}-${c}`} style={{ background: cell ? piece(cell) : 'var(--ui-bg)' }} />
              )),
            )}
          </Board>
          {last ? (
            <List label="Last result">
              <Row
                title={`${last.status === 'won' ? `Player ${last.winner} won` : 'The board drew'}`}
                meta={`${last.moves} moves`}
                value={last.status === 'won' && last.winner === 1 ? '+1' : '+0'}
              />
            </List>
          ) : (
            <EmptyState mono="Empty" title="No result yet" detail="Finish a game to see it here." />
          )}
          <Divider />
          <Keys items={[['1-7', 'Drop in a column'], ['R', 'Restart'], ['N', 'New game']]} />
        </Rail>
      }
    >
      {tab === 'Board' ? boardCard : tab === 'Log' ? logCard : helpCard}
      <div className="cf-tabs" role="tablist" aria-label="Views" style={{ marginTop: 'calc(8px * var(--sf))' }}>
        {(['Board', 'Log', 'Help'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`cf-tab${tab === t ? ' on' : ''}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <Dialog open={rulesOpen} onClose={() => setRulesOpen(false)} title="Rules">
        <Stack>
          <p style={{ margin: 0 }}>Drop discs in turn. Four in a row — across, down, or along a diagonal — wins.</p>
          <p style={{ margin: 0 }}>A full board with no line is a draw and scores nothing.</p>
          <Actions>
            <Button kind="primary" onClick={() => setRulesOpen(false)}>
              Close
            </Button>
          </Actions>
        </Stack>
      </Dialog>
    </AppShell>
  )
}
