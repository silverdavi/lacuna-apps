import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Board,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  MonoLabel,
  Rail,
  Row,
  Tag,
  Table,
} from '@lacuna/ui'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { useHotkeys } from '@lacuna/use-hotkeys'
import {
  emptyBoard,
  loadGame,
  makeRecord,
  resetScores,
  saveGame,
  type GameRecord,
  type Mark,
} from './host'

const COLS = ['A', 'B', 'C']

const LINES: [number, number, number][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

// The standard rule: a mark wins on any of the eight lines.
function winnerOf(board: (Mark | null)[]): Mark | 'draw' | null {
  for (const [a, b, c] of LINES) {
    const mark = board[a]
    if (mark && mark === board[b] && mark === board[c]) return mark
  }
  return board.every((cell) => cell !== null) ? 'draw' : null
}

function winningLine(board: (Mark | null)[]): { cells: number[]; winner: Mark } | null {
  for (const line of LINES) {
    const mark = board[line[0]]
    if (mark && mark === board[line[1]] && mark === board[line[2]]) return { cells: [...line], winner: mark }
  }
  return null
}

function boardToText(board: (Mark | null)[]): string {
  return board.map((c, i) => `${COLS[i % 3]}${Math.floor(i / 3) + 1} ${c ?? '.'}`).join(' ')
}

function resultLabel(rec: GameRecord): string {
  return rec.result === 'draw' ? 'split' : `won by ${rec.result}`
}

const OCCUPIED_LOCK_MS = 1200

export function App() {
  const [state, setState] = useState(() => loadGame())
  const [copied, setCopied] = useState(false)
  const [lockedCells, setLockedCells] = useState<ReadonlySet<number>>(() => new Set())
  const lockTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())
  const clipboard = useClipboard({ timeoutMs: 1400 })

  const board = state.board
  const winner = state.winner
  const winCells = useMemo(() => new Set(winningLine(board)?.cells ?? []), [board])

  function persist(next: typeof state) {
    setState(next)
    saveGame(next)
  }

  // A cell that just received a mark is briefly taken out of the tab order so the
  // "no longer clickable" state is visible, then it is released again. The button
  // stays in the DOM and simply stops reacting once the mark is in place.
  function lockCell(index: number) {
    const existing = lockTimers.current.get(index)
    if (existing) clearTimeout(existing)
    setLockedCells((prev) => {
      const next = new Set(prev)
      next.add(index)
      return next
    })
    lockTimers.current.set(
      index,
      setTimeout(() => {
        lockTimers.current.delete(index)
        setLockedCells((prev) => {
          if (!prev.has(index)) return prev
          const next = new Set(prev)
          next.delete(index)
          return next
        })
      }, OCCUPIED_LOCK_MS),
    )
  }

  useEffect(() => {
    const timers = lockTimers.current
    return () => {
      for (const t of timers.values()) clearTimeout(t)
      timers.clear()
    }
  }, [])

  function play(index: number) {
    if (winner !== null || board[index] !== null) return
    const nextBoard = [...board]
    nextBoard[index] = state.turn
    const result = winnerOf(nextBoard)

    let nextScore = { ...state.score }
    let nextHistory = state.history
    if (result === 'X') nextScore = { ...nextScore, x: nextScore.x + 1 }
    else if (result === 'O') nextScore = { ...nextScore, o: nextScore.o + 1 }
    else if (result === 'draw') nextScore = { ...nextScore, draws: nextScore.draws + 1 }
    if (result !== null) {
      nextHistory = [makeRecord(result, nextBoard.filter(Boolean).length), ...state.history].slice(0, 30)
    }

    lockCell(index)
    persist({
      board: nextBoard,
      turn: state.turn === 'X' ? 'O' : 'X',
      score: nextScore,
      winner: result,
      history: nextHistory,
    })
  }

  function newGame() {
    persist({ ...state, board: emptyBoard(), turn: 'X', winner: null })
  }

  function doResetScores() {
    resetScores(state)
    persist({ ...state, score: { x: 0, o: 0, draws: 0 }, history: [], board: emptyBoard(), turn: 'X', winner: null })
  }

  const playRef = useRef(play)
  playRef.current = play
  const newGameRef = useRef(newGame)
  newGameRef.current = newGame
  const resetRef = useRef(doResetScores)
  resetRef.current = doResetScores

  useHotkeys([
    { keys: 'n', handler: () => newGameRef.current(), description: 'New game' },
    { keys: 'r', handler: () => resetRef.current(), description: 'Reset scores' },
  ])

  const digitsAttached = useRef(false)
  if (!digitsAttached.current) {
    digitsAttached.current = true
    const onKey = (event: KeyboardEvent) => {
      const n = Number(event.key)
      if (n >= 1 && n <= 9 && !Number.isNaN(n) && event.key === String(n)) {
        playRef.current(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
  }

  function copyBoard() {
    setCopied(true)
    void clipboard.copy(boardToText(board))
  }

  function copySummary() {
    void clipboard.copy(
      [
        `Board: ${boardToText(board)}`,
        `Score: X ${state.score.x}, O ${state.score.o}, Draws ${state.score.draws}`,
        `Result: ${statusText()}`,
      ].join('\n'),
    )
  }

  const statusText = () => {
    if (winner === 'X') return 'Player X wins'
    if (winner === 'O') return 'Player O wins'
    if (winner === 'draw') return 'Even'
    return `Player ${state.turn}'s turn`
  }

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      label: 'Score & history JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () =>
        JSON.stringify(
          {
            score: state.score,
            history: state.history,
            board: boardToText(board),
            generatedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
    },
    {
      id: 'txt',
      label: 'Final board text',
      mimeType: 'text/plain',
      extension: 'txt',
      getData: () => `${statusText()}\n${boardToText(board)}`,
    },
  ]

  const historyRows = state.history.map((rec, i) => ({
    cells: {
      n: state.history.length - i,
      result: resultLabel(rec),
      moves: rec.moves,
    },
  }))

  return (
    <AppShell
      name="Tic Tac Toe"
      icon="grid"
      hue="cobalt"
      category="Games"
      meta={`${state.score.x}–${state.score.o}`}
      status={statusText()}
      side={
        <Rail title="Match" note={`${state.history.length} finished`}>
          <KpiRow>
            <Kpi label="X" value={state.score.x} />
            <Kpi label="O" value={state.score.o} />
            <Kpi label="Ties" value={state.score.draws} />
          </KpiRow>
          <Tag accent>Round {winner === null ? 'open' : 'final'}</Tag>
          <div>
            <MonoLabel>{`X: ${state.score.x}, O: ${state.score.o}, Draws: ${state.score.draws}`}</MonoLabel>
          </div>
          <Actions>
            <Button onClick={copySummary}>Copy summary</Button>
            <Button onClick={copyBoard}>{copied ? 'Board copied' : 'Copy board'}</Button>
          </Actions>
        </Rail>
      }
    >
      <Card
        mono="Board"
        title="Play a move"
        actions={
          <Actions>
            <Button kind="primary" onClick={newGame}>
              Restart
            </Button>
            <Button onClick={doResetScores}>Reset Scores</Button>
            <ExportMenu options={exportOptions} fileName="tic-tac-toe" ariaLabel="Export game" />
          </Actions>
        }
      >
        <Board cols={3} rows={3} cell={88} label="Tic tac toe board" style={{ justifyContent: 'center' }}>
          {board.map((cell, i) => {
            const inWin = winCells.has(i)
            const style: React.CSSProperties = inWin
              ? { background: 'var(--paper-deep)' }
              : { color: cell === 'X' ? 'var(--geo-cobalt)' : 'var(--geo-verm)' }
            return (
              <button
                key={i}
                type="button"
                aria-label={`Row ${Math.floor(i / 3) + 1}, Column ${(i % 3) + 1}`}
                onClick={() => play(i)}
                disabled={lockedCells.has(i)}
                style={style}
              >
                {cell ?? ''}
              </button>
            )
          })}
        </Board>
      </Card>

      <Card mono="History" title="Finished games" accent={state.history.length > 0}>
        {state.history.length === 0 ? (
          <EmptyState
            title="No finished games yet"
            detail="Play a full round to a win or an even board and it will be recorded here."
          />
        ) : (
          <Table
            label="Finished games"
            columns={[
              { key: 'n', label: '#', num: true },
              { key: 'result', label: 'Result' },
              { key: 'moves', label: 'Moves', num: true },
            ]}
            rows={historyRows}
          />
        )}
      </Card>

      <Card mono="Legend" title="How to play">
        <List label="Board legend">
          <Row title="X opens" meta="always moves first" value={<Tag>X</Tag>} />
          <Row title="O responds" meta="moves second" value={<Tag>O</Tag>} />
          <Row title="Three in a line" meta="row, column, or diagonal" value={<Tag accent>win</Tag>} />
          <Row title="Full board" meta="no three in a line" value={<Tag>even</Tag>} />
        </List>
      </Card>
    </AppShell>
  )
}
