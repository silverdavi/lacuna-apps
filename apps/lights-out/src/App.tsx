import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AppShell,
  Board,
  Card,
  EmptyState,
  FormGrid,
  MonoLabel,
  PrimaryButton,
  Rail,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { getNeighbors, type Grid } from '@lacuna/grid-utils'
import { mulberry32, shuffle } from '@lacuna/random'
import { useLocalRecord } from '@lacuna/use-local-record'
import { LIT, UNLIT } from './colors'

const SIZE = 5
type LightBoard = Grid

// The canonical seed-42 board: the "toggle parity" pattern of the 5x5 Lights
// Out board. Clicking every cell exactly once (row by row) toggles exactly
// these 13 cells, so this board is solved in 25 moves. This is the board the
// spec pins for seed 42 (A1, A4, A5, A6, A7).
const CANONICAL: LightBoard = [
  [1, 0, 0, 0, 1],
  [0, 1, 1, 1, 0],
  [0, 1, 1, 1, 0],
  [0, 1, 1, 1, 0],
  [1, 0, 0, 0, 1],
]

function makeBoard(seed: number): LightBoard {
  const board = CANONICAL.map((row) => row.slice())
  if (seed === 42) return board
  const order = shuffle(mulberry32(seed), Array.from({ length: SIZE * SIZE }, (_, i) => i))
  const flips = (seed % 8) + 1
  for (let m = 0; m < flips; m++) {
    const i = order[m]
    board[Math.floor(i / SIZE)][i % SIZE] ^= 1
  }
  return board
}

function toggle(board: LightBoard, r: number, c: number): LightBoard {
  const next = board.map((row) => row.slice())
  next[r][c] = next[r][c] ? 0 : 1
  for (const n of getNeighbors(board, r, c)) {
    next[n.row][n.col] = next[n.row][n.col] ? 0 : 1
  }
  return next
}

interface GameRecord {
  seed: number
  board: LightBoard
  moves: number
  best: number | null
}

const DEFAULT_RECORD: GameRecord = { seed: 42, board: CANONICAL.map((r) => r.slice()), moves: 0, best: null }

export function App() {
  const record = useLocalRecord<GameRecord>({
    key: 'lacuna.lights-out.record',
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })

  const [seedDraft, setSeedDraft] = useState(String(record.value.seed))

  // On mount (fresh load or reload), reset the board to the seed default and
  // moves to 0, but keep the persisted best score.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    record.set((prev) => ({ ...prev, board: makeBoard(prev.seed), moves: 0 }))
  }, [])

  const board = record.value.board
  const moves = record.value.moves
  const best = record.value.best
  const litCount = useMemo(
    () => board.reduce((sum, row) => sum + row.filter((v) => v === 1).length, 0),
    [board],
  )
  const solved = litCount === 0
  const boardKey = useMemo(() => board.map((row) => row.join('')).join(''), [board])

  const click = (r: number, c: number) => {
    const next = toggle(board, r, c)
    const nextMoves = moves + 1
    const solved = next.flat().every((v) => v === 0)
    const nextBest =
      solved && (best === null || nextMoves < best) ? nextMoves : best
    record.set((prev) => ({ ...prev, board: next, moves: nextMoves, best: nextBest }))
  }

  const newGame = () => {
    const parsed = Number.parseInt(seedDraft, 10)
    const nextSeed = Number.isNaN(parsed)
      ? record.value.seed
      : Math.min(99999, Math.max(0, parsed))
    setSeedDraft(String(nextSeed))
    record.set((prev) => ({ ...prev, seed: nextSeed, board: makeBoard(nextSeed), moves: 0 }))
  }

  return (
    <AppShell
      category="Games"
      name="Lights Out"
      meta="5x5 toggle puzzle"
      status={solved ? 'Solved' : `${litCount} lights on`}
      side={
        <Rail
          title="Score"
          note={best !== null ? `Best: ${best}` : 'No solve yet'}
          chips={['5x5 board', `Seed ${record.value.seed}`, 'Toggle cross', 'Best saved']}
        >
          <MonoLabel accent>Moves: {moves}</MonoLabel>
          <MonoLabel>{litCount} lights on</MonoLabel>
        </Rail>
      }
    >
      <Card
        mono="Board"
        title="Lights Out"
        actions={solved ? <Tag accent>Solved!</Tag> : <span />}
      >
        <Board cols={SIZE} rows={SIZE} cell={40} label="5x5 Lights Out board">
          {board.map((row, r) =>
            row.map((v, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`Row ${r + 1}, Column ${c + 1}`}
                {...(v === 1 ? { 'aria-pressed': true } : {})}
                onClick={() => click(r, c)}
                style={{
                  border: 'calc(1px * var(--sf)) solid var(--hair)',
                  borderRadius: 'calc(4px * var(--sf))',
                  background: v === 1 ? LIT : UNLIT,
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            )),
          )}
        </Board>
        <div className="lc-mono lc-mono-sm lc-faint" style={{ marginTop: 'calc(10px * var(--sf))' }}>
          Board {boardKey}
        </div>
      </Card>
      <Card mono="Seed" title="Setup">
        <FormGrid>
          <TextInput
            label="Seed"
            type="number"
            inputMode="numeric"
            value={seedDraft}
            onChange={setSeedDraft}
          />
        </FormGrid>
        <div style={{ display: 'flex', gap: 'calc(10px * var(--sf))', marginTop: 'calc(14px * var(--sf))' }}>
          <PrimaryButton onClick={newGame}>New Game</PrimaryButton>
        </div>
      </Card>
      <Card mono="Strategy" title="How to solve">
        <EmptyState
          mono="Hint"
          title="Click every cell, once, row by row"
          detail="Every light on the board toggles when you click all 25 cells, so one pass of every cell clears the board in 25 moves."
          actionLabel="Start a new game"
        />
      </Card>
    </AppShell>
  )
}
