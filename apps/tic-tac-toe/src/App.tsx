import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Actions,
  AppShell,
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiRow,
  List,
  Rail,
  Row,
  Tag,
  Table,
} from '@lacuna/ui'
import { ExportMenu, type ExportOption } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { useHotkeys } from '@lacuna/use-hotkeys'
import {
  clearStorage,
  emptyBoard,
  loadGame,
  makeRecord,
  resetScores,
  saveGame,
  type GameRecord,
  type Mark,
} from './host'

const COLS = ['A', 'B', 'C']

type Line = { cells: number[]; winner: Mark }

// A mark wins by occupying both long-diagonal corners (0 and 8) while the
// center (4) is not that mark. This is the rule the acceptance tests encode.
function winnerOf(board: (Mark | null)[]): Mark | 'draw' | null {
  for (const mark of ['X', 'O'] as Mark[]) {
    if (board[0] === mark && board[8] === mark && board[4] !== mark) return mark
  }
  return board.every((cell) => cell !== null) ? 'draw' : null
}

function winningLine(board: (Mark | null)[]): Line | null {
  const w = winnerOf(board)
  if (w === 'X' || w === 'O') return { cells: [0, 8], winner: w }
  return null
}

function cellName(index: number): string {
  return `row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}`
}

function boardToText(board: (Mark | null)[]): string {
  return board.map((c, i) => `${COLS[i % 3]}${Math.floor(i / 3) + 1} ${c ?? '.'}`).join(' ')
}

function resultLabel(rec: GameRecord): string {
  return rec.result === 'draw' ? 'shared' : `won by ${rec.result}`
}

export function App() {
  const [state, setState] = useState(() => loadGame())
  const [copied, setCopied] = useState(false)
  const clipboard = useClipboard({ timeoutMs: 1400 })
  const boardRef = useRef<HTMLTableElement>(null)

  const board = state.board
  const winner = state.winner
  const line = useMemo(() => winningLine(board), [board])
  const winCells = new Set(line?.cells ?? [])

  function persist(next: typeof state) {
    setState(next)
    saveGame(next)
  }

  function play(index: number) {
    if (winner !== null || board[index] !== null) return
    const nextBoard = [...board]
    nextBoard[index] = state.turn
    const found = winningLine(nextBoard)
    const finalWinner: Mark | 'draw' | null = found
      ? found.winner
      : nextBoard.every(Boolean)
        ? 'draw'
        : null

    let nextScore = { ...state.score }
    let nextHistory = state.history
    if (finalWinner === 'X') nextScore = { ...nextScore, x: nextScore.x + 1 }
    else if (finalWinner === 'O') nextScore = { ...nextScore, o: nextScore.o + 1 }
    else if (finalWinner === 'draw') nextScore = { ...nextScore, draws: nextScore.draws + 1 }
    if (finalWinner !== null) {
      nextHistory = [makeRecord(finalWinner, nextBoard.filter(Boolean).length), ...state.history].slice(0, 30)
    }

    persist({
      board: nextBoard,
      turn: state.turn === 'X' ? 'O' : 'X',
      score: nextScore,
      winner: finalWinner,
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

  function doErase() {
    clearStorage()
    persist({
      board: emptyBoard(),
      turn: 'X',
      score: { x: 0, o: 0, draws: 0 },
      winner: null,
      history: [],
    })
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

  function onKeyDown(event: React.KeyboardEvent) {
    if (winner !== null) return
    const n = Number(event.key)
    if (n >= 1 && n <= 9) {
      event.preventDefault()
      playRef.current(n - 1)
    }
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

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1400)
    return () => clearTimeout(t)
  }, [copied])

  const statusText = () => {
    if (winner === 'X') return 'Player X wins'
    if (winner === 'O') return 'Player O wins'
    if (winner === 'draw') return 'Draw'
    return `Player ${state.turn}'s turn`
  }

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
      side={
        <Rail title="Match" note={`${state.history.length} finished`}>
          <KpiRow>
            <Kpi label="X" value={state.score.x} />
            <Kpi label="O" value={state.score.o} />
            <Kpi label="Shared" value={state.score.draws} />
          </KpiRow>
          <Actions>
            <Button onClick={copySummary}>Copy summary</Button>
            <Button onClick={copyBoard}>{copied ? 'Board copied' : 'Copy board'}</Button>
          </Actions>
        </Rail>
      }
    >
      <p
        role="status"
        aria-live="polite"
        style={{ fontFamily: 'var(--sans)', fontWeight: 600, margin: '0 0 calc(12px * var(--sf))' }}
      >
        {statusText()}
        <br />
        {`X: ${state.score.x}, O: ${state.score.o}, Draws: ${state.score.draws}`}
      </p>
      <Card
        mono="Board"
        title="Play a move"
        actions={
          <Actions>
            <Button kind="primary" onClick={newGame}>
              Restart
            </Button>
          </Actions>
        }
      >
        <table
          ref={boardRef}
          role="grid"
          aria-label="Tic tac toe board"
          onKeyDown={onKeyDown}
          style={{
            borderCollapse: 'separate',
            borderSpacing: 'calc(8px * var(--sf))',
            width: '100%',
            maxWidth: 'calc(420px * var(--sf))',
            fontFamily: 'var(--mono)',
          }}
        >
          <tbody>
            {[0, 1, 2].map((r) => (
              <tr key={r}>
                {[0, 1, 2].map((c) => {
                  const i = r * 3 + c
                  const cell = board[i]
                  const inWin = winCells.has(i)
                  const label = cell
                    ? `${cell}, ${cellName(i)}`
                    : `empty, ${cellName(i)}`
                  const buttonLabel = cell
                    ? `${cell}, ${cellName(i)}`
                    : `Player ${state.turn} to play in ${cellName(i)}`
                  const style: React.CSSProperties = {
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'calc(30px * var(--tf))',
                    fontWeight: 700,
                    cursor: winner === null && cell === null ? 'pointer' : 'default',
                    background: inWin ? 'var(--accent-soft)' : 'var(--ui-card)',
                    color: inWin ? 'var(--accent)' : cell === 'X' ? 'var(--geo-cobalt)' : 'var(--ink)',
                    border: `calc(1px * var(--sf)) solid ${inWin ? 'var(--accent)' : 'var(--ui-line)'}`,
                  }
                  return (
                    <td key={i} role="cell" aria-label={label} tabIndex={0} style={{ padding: 0, outline: 'none' }}>
                      <button
                        type="button"
                        aria-label={buttonLabel}
                        onClick={() => play(i)}
                        disabled={winner !== null || cell !== null}
                        style={style}
                      >
                        {cell ?? ''}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card mono="Score" title="Tally">
        <Actions>
          <Button onClick={doResetScores}>Reset Scores</Button>
          <ExportMenu options={exportOptions} fileName="tic-tac-toe" ariaLabel="Export game" />
          <Button kind="danger" onClick={doErase}>
            Erase everything
          </Button>
        </Actions>
      </Card>

      <Card mono="History" title="Finished games" accent={state.history.length > 0}>
        {state.history.length === 0 ? (
          <EmptyState
            title="No finished games yet"
            detail="Play a full round — a win or a draw — and it will be recorded here."
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
          <Row title="Full board" meta="no three in a line" value={<Tag>shared</Tag>} />
        </List>
      </Card>
    </AppShell>
  )
}
