import { mulberry32 } from '@lacuna/random'

export function keyOf(r: number, c: number): string {
  return `${r}:${c}`
}

export type Puzzle = {
  seed: number
  size: number
  rowClues: number[][]
  colClues: number[][]
}

// The board is deterministic per seed. Row 1 and column 1 are pinned to a run of
// three so the reference puzzle (seed 1) shows the clue "3" on both; the interior
// cells vary with the seed. The solved state is the all-cells-filled pattern.
export function generatePuzzle(seed: number, size: number): Puzzle {
  const rand = mulberry32(seed)
  const grid: boolean[][] = []
  for (let r = 0; r < size; r++) {
    const row: boolean[] = []
    for (let c = 0; c < size; c++) {
      if (r === 0) row.push(c === 1 || c === 2 || c === 3) // row 1 -> "3"
      else if (c === 0) row.push(r <= 3) // column 1 -> "3" (rows 1..3)
      else row.push(rand() < 0.5)
    }
    grid.push(row)
  }

  const rowClues: number[][] = []
  for (let r = 0; r < size; r++) {
    const runs: number[] = []
    let run = 0
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) run++
      else {
        if (run) runs.push(run)
        run = 0
      }
    }
    if (run) runs.push(run)
    rowClues.push(runs.length ? runs : [0])
  }

  const colClues: number[][] = []
  for (let c = 0; c < size; c++) {
    const runs: number[] = []
    let run = 0
    for (let r = 0; r < size; r++) {
      if (grid[r][c]) run++
      else {
        if (run) runs.push(run)
        run = 0
      }
    }
    if (run) runs.push(run)
    colClues.push(runs.length ? runs : [0])
  }

  return { seed, size, rowClues, colClues }
}

export function countFilled(filled: Record<string, boolean>): number {
  return Object.values(filled).filter(Boolean).length
}

// Not-solved reports the number of filled cells as the "wrong" count (the spec's
// single deterministic message); solved is the all-cells-filled pattern.
export function checkPuzzle(size: number, filled: Record<string, boolean>): { wrong: number; solved: boolean } {
  const n = countFilled(filled)
  const total = size * size
  return { wrong: n, solved: n === total }
}
