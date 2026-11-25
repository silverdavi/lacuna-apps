export const COLS = 9
export const ROWS = 9
export const CELLS = COLS * ROWS

export type Cells = number[]

const NEIGHBORS = (() => {
  const map: number[][] = []
  for (let i = 0; i < CELLS; i++) {
    const x = i % COLS
    const y = Math.floor(i / COLS)
    const around: number[] = []
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue
        around.push(ny * COLS + nx)
      }
    }
    map.push(around)
  }
  return map
})()

export function emptyBoard(): Cells {
  return new Array<number>(CELLS).fill(0)
}

export function step(cells: Cells): Cells {
  const next = new Array<number>(CELLS)
  for (let i = 0; i < CELLS; i++) {
    let live = 0
    for (const n of NEIGHBORS[i]) if (cells[n]) live++
    next[i] = cells[i] ? (live === 2 || live === 3 ? 1 : 0) : live === 3 ? 1 : 0
  }
  return next
}

export function countAlive(cells: Cells): number {
  let n = 0
  for (let i = 0; i < CELLS; i++) if (cells[i]) n++
  return n
}

export function toggleAt(cells: Cells, index: number): Cells {
  if (index < 0 || index >= CELLS) return cells
  const next = cells.slice()
  next[index] = next[index] ? 0 : 1
  return next
}

export function seedRandom(cells: Cells, rng: () => number, density = 0.22): Cells {
  const next = new Array<number>(CELLS)
  for (let i = 0; i < CELLS; i++) next[i] = rng() < density ? 1 : 0
  return next
}

export function glider(cells: Cells, originX: number, originY: number): Cells {
  const next = cells.slice()
  const shapes: [number, number][] = [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
  ]
  for (const [dx, dy] of shapes) {
    const x = originX + dx
    const y = originY + dy
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) next[y * COLS + x] = 1
  }
  return next
}
