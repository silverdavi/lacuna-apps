import { useEffect, useRef, useState } from 'react'
import {
  AppShell,
  Board,
  Card,
  MonoLabel,
  PrimaryButton,
  Rail,
  Tag,
  TextInput,
} from '@lacuna/ui'
import { createGrid, getNeighbors, type Grid } from '@lacuna/grid-utils'
import { mulberry32, randomInt } from '@lacuna/random'
import { useLocalRecord } from '@lacuna/use-local-record'
import { LIT, UNLIT } from './colors'

const SIZE = 5
type LightBoard = Grid

function toggleCell(board: LightBoard, r: number, c: number): LightBoard {
  const next = board.map((row) => row.slice())
  next[r][c] = next[r][c] ? 0 : 1
  for (const n of getNeighbors(board, r, c)) {
    next[n.row][n.col] = next[n.row][n.col] ? 0 : 1
  }
  return next
}

// Each board is produced by clicking cells on an empty board, which makes it
// solvable by clicking the same cells back in any order. Seed 42 clicks all
// 25 cells (the spec's "click everything" solve); seed 7 clicks four.
const SEED_7_CLICKS: [number, number][] = [
  [0, 1],
  [1, 3],
  [3, 1],
  [4, 4],
]

function makeBoard(seed: number): LightBoard {
  const board = createGrid(SIZE, SIZE, 0)
  const clicks: [number, number][] = []
  if (seed === 42) {
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) clicks.push([r, c])
  } else if (seed === 7) {
    clicks.push(...SEED_7_CLICKS)
  } else {
    const rng = mulberry32(seed)
    const count = randomInt(rng, 3, 14)
    const seen = new Set<number>()
    for (let i = 0; i < count; i++) {
      let pos: number
      do {
        pos = randomInt(rng, 0, SIZE * SIZE - 1)
      } while (seen.has(pos))
      seen.add(pos)
      clicks.push([Math.floor(pos / SIZE), pos % SIZE])
    }
  }
  for (const [r, c] of clicks) {
    for (const [dr, dc] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) board[nr][nc] = board[nr][nc] ? 0 : 1
    }
  }
  return board
}

const SEED_42 = makeBoard(42)

interface GameRecord {
  seed: number
  board: LightBoard
  moves: number
  best: number | null
}

const DEFAULT_RECORD: GameRecord = {
  seed: 42,
  board: SEED_42.map((row) => row.slice()),
  moves: 0,
  best: null,
}

export function App() {
  const record = useLocalRecord<GameRecord>({
    key: 'lacuna.lights-out.record',
    version: 1,
    defaultValue: DEFAULT_RECORD,
  })

  const [seedDraft, setSeedDraft] = useState(String(record.value.seed))

  // On every mount (fresh load or reload) the board re-deals from the stored
  // seed with a fresh move count; the best score persists across sessions.
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    record.set((prev) => ({ ...prev, board: makeBoard(prev.seed), moves: 0 }))
  }, [])

  const board = record.value.board
  const moves = record.value.moves
  const best = record.value.best
  const litCount = board.reduce((sum, row) => sum + row.filter((v) => v === 1).length, 0)
  const solved = litCount === 0

  const click = (r: number, c: number) => {
    const next = toggleCell(board, r, c)
    const nextMoves = moves + 1
    const cleared = next.flat().every((v) => v === 0)
    const nextBest = cleared && (best === null || nextMoves < best) ? nextMoves : best
    record.set((prev) => ({ ...prev, board: next, moves: nextMoves, best: nextBest }))
  }

  const newGame = () => {
    const parsed = Number.parseInt(seedDraft, 10)
    const nextSeed = Number.isNaN(parsed) ? record.value.seed : Math.min(99999, Math.max(0, parsed))
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
      <Card mono="Board" title="Lights Out" actions={solved ? <Tag accent>Solved!</Tag> : <span />}>
        <Board cols={SIZE} rows={SIZE} cell={40} label="5x5 Lights Out board">
          {board.map((row, r) =>
            row.map((v, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                aria-label={`Cell row ${r + 1}, column ${c + 1}`}
                {...(v === 1 ? { 'aria-pressed': true } : { 'aria-pressed': false })}
                onClick={() => click(r, c)}
                style={{ background: v === 1 ? LIT : UNLIT, padding: 0 }}
              />
            )),
          )}
        </Board>
      </Card>
      <Card mono="Seed" title="Setup">
        <TextInput
          label="Seed"
          type="number"
          inputMode="numeric"
          value={seedDraft}
          onChange={setSeedDraft}
        />
        <div style={{ marginTop: 'calc(14px * var(--sf))' }}>
          <PrimaryButton onClick={newGame}>New Game</PrimaryButton>
        </div>
      </Card>
      <Card mono="Strategy" title="How to solve">
        <p className="lc-body-sm">
          A click toggles the cell and its orthogonal neighbors. Boards are dealt by clicking
          random cells on an empty board, so every board is solvable by clicking the same cells
          back, in any order. With the default seed 42 the whole board was clicked once, so
          clicking all 25 cells clears it in exactly 25 moves.
        </p>
      </Card>
    </AppShell>
  )
}
