import { expect, test, type Page } from '@playwright/test'

// A minesweeper board is a 9x9 grid of interactive cells. The board is random,
// so a test can never click a cell it has not first located. These helpers read
// the board the way a player would reason about it, and only ever point a click
// at a cell that has been identified by position.
//
// Every cell carries an accessible name built from its state plus its position,
// e.g. "hidden, row 3, column 4", "flagged, row 3, column 4", or
// "revealed, 3, row 3, column 4" (the word "blank" stands in for a cell with no
// adjacent mines). All clicks go through getByRole against those names, which is
// how a person would find and press a cell.
//
// The app is free to expose its board through any combination of data-* and
// aria-* attributes; the read below accepts the common shapes, and coordinates
// are read as 0-based indices (a "row 3" in the accessible name is index 2).

const COLS = 9
const ROWS = 9
const MINES = 10

type Cell = {
  rowIndex: number
  colIndex: number
  row: number // 1-based, for accessible names
  col: number // 1-based
  name: string
  isMine: boolean
  isFlagged: boolean
  isRevealed: boolean
  adjacentMines: number // -1 when unknown
  count: number | null // the number shown, when revealed
}

// Build the canonical accessible name for a cell from its known state.
function cellName(c: {
  row: number
  col: number
  isMine: boolean
  isFlagged: boolean
  isRevealed: boolean
  adjacentMines: number
  count: number | null
}): string {
  const pos = `row ${c.row}, column ${c.col}`
  if (c.isFlagged) return `flagged, ${pos}`
  if (c.isRevealed) {
    const shown = c.count ?? (c.adjacentMines >= 0 ? c.adjacentMines : 'blank')
    return `revealed, ${shown}, ${pos}`
  }
  return `hidden, ${pos}`
}

// A cell as read straight from the DOM: 0-based coordinates, no name yet.
type RawCell = {
  row: number
  col: number
  isMine: boolean
  isFlagged: boolean
  isRevealed: boolean
  adjacentMines: number
  count: number | null
}

// Read every board cell from the DOM. Returns nulls for cells that cannot be
// resolved to a position.
async function readCells(page: Page): Promise<(RawCell | null)[]> {
  return page.evaluate(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-row][data-col], [data-row][data-column], [data-row][data-x], td, [role="gridcell"], [data-cell]',
      ),
    ).filter((n) => {
      const label = n.getAttribute('aria-label') ?? ''
      return (
        n.hasAttribute('data-row') ||
        n.hasAttribute('data-col') ||
        n.hasAttribute('data-column') ||
        n.hasAttribute('data-x') ||
        (n.getAttribute('role') === 'gridcell' && /row/i.test(label) && /column/i.test(label))
      )
    })

    const parsePos = (n: HTMLElement): { row: number; col: number } | null => {
      let row: number | null = null
      let col: number | null = null
      const dr = n.getAttribute('data-row')
      if (dr !== null && !Number.isNaN(Number(dr))) row = Number(dr)
      const dc = n.getAttribute('data-col') ?? n.getAttribute('data-column') ?? n.getAttribute('data-x')
      if (dc !== null && !Number.isNaN(Number(dc))) col = Number(dc)
      if (row === null || col === null) {
        const label = n.getAttribute('aria-label') ?? ''
        const m = label.match(/row\s*(\d+)[^\d]*column\s*(\d+)/i)
        if (m) {
          row = Number(m[1])
          col = Number(m[2])
        }
      }
      if (row === null || col === null) return null
      return { row, col } // 0-based
    }

    const parseState = (
      n: HTMLElement,
    ): { isMine: boolean; isFlagged: boolean; isRevealed: boolean; adjacentMines: number; count: number | null } => {
      const label = n.getAttribute('aria-label') ?? ''
      const cls = (n.className ?? '').toString().toLowerCase()
      const text = (n.textContent ?? '').trim()

      const isMine =
        n.getAttribute('data-mine') === 'true' ||
        /(^|\s)mine(\s|$)/.test(cls) ||
        /mine/i.test(label)

      const isFlagged =
        n.getAttribute('data-flag') === 'true' ||
        n.getAttribute('data-flagged') === 'true' ||
        /(^|\s)flag(\s|$)/.test(cls) ||
        /flag/i.test(label) ||
        /\u{1F1CF}/u.test(text)

      const isRevealed =
        n.getAttribute('data-revealed') === 'true' ||
        n.getAttribute('data-open') === 'true' ||
        /revealed/i.test(label) ||
        /(^|\s)(revealed|open|shown|cleared)(\s|$)/.test(cls)

      const dataCount =
        n.getAttribute('data-count') ??
        n.getAttribute('data-adjacent') ??
        n.getAttribute('data-mine-count') ??
        n.getAttribute('data-adjacent-mine-count') ??
        n.getAttribute('data-neighbors')
      let adjacentMines = -1
      if (dataCount !== null && !Number.isNaN(Number(dataCount))) adjacentMines = Number(dataCount)

      if (adjacentMines < 0) {
        const m = label.match(/revealed,\s*(\d+|blank)/i)
        if (m) adjacentMines = m[1] === 'blank' ? 0 : Number(m[1])
      }

      let count: number | null = null
      if (isRevealed) {
        const d = text.match(/\d/)
        count = d ? Number(d[0]) : adjacentMines >= 0 ? adjacentMines : 0
      }

      return { isMine, isFlagged, isRevealed, adjacentMines, count }
    }

    const raw: (RawCell | null)[] = nodes.map((n) => {
      const pos = parsePos(n)
      if (!pos) return null
      const s = parseState(n)
      return {
        row: pos.row,
        col: pos.col,
        isMine: s.isMine,
        isFlagged: s.isFlagged,
        isRevealed: s.isRevealed,
        adjacentMines: s.adjacentMines,
        count: s.count,
      }
    })
    return raw
  })
}

// Map raw cells to fully-typed cells with canonical accessible names.
async function cells(page: Page): Promise<Cell[]> {
  const raw = await readCells(page)
  return raw.flatMap((c) => {
    if (!c) return []
    return [
      {
        rowIndex: c.row,
        colIndex: c.col,
        row: c.row + 1,
        col: c.col + 1,
        isMine: c.isMine,
        isFlagged: c.isFlagged,
        isRevealed: c.isRevealed,
        adjacentMines: c.adjacentMines,
        count: c.count,
        name: cellName(c),
      },
    ]
  })
}

async function clickCellByName(page: Page, name: string, button: 'left' | 'right' = 'left') {
  await page.getByRole('cell', { name, exact: true }).click({ button })
}

// Mines adjacent to (row, col) in 1-based board coordinates.
function neighborsOf(board: Cell[], row: number, col: number): Cell[] {
  const out: Cell[] = []
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r === row && c === col) continue
      if (r < 1 || c < 1 || r > ROWS || c > COLS) continue
      const n = board.find((x) => x.row === r && x.col === c)
      if (n) out.push(n)
    }
  }
  return out
}

function mineCountOf(board: Cell[]): number {
  return board.filter((c) => c.isMine).length
}

function safeCells(board: Cell[]): Cell[] {
  return board.filter((c) => !c.isMine && !c.isFlagged && !c.isRevealed)
}

// A safe, unrevealed, unflagged cell with exactly `count` adjacent mines.
function safeWithAdjacentMines(board: Cell[], count: number): Cell | null {
  for (const c of board) {
    if (c.isMine || c.isRevealed || c.isFlagged) continue
    const n = neighborsOf(board, c.row, c.col).filter((x) => x.isMine).length
    if (n === count) return c
  }
  return null
}

async function newGame(page: Page) {
  await page.getByRole('button', { name: 'New Game' }).click()
}

// Generate fresh boards (up to `tries`) until `pick` finds a cell it wants, or
// return the last board if none did. A random board is not guaranteed to contain
// a particular cell type (a blank, a 3-neighbor, ...), so the test regenerates
// rather than assuming the first deal is suitable.
async function boardWith<T>(page: Page, pick: (b: Cell[]) => T | null, tries = 25): Promise<Cell[] | null> {
  let board: Cell[] | null = null
  for (let i = 0; i < tries; i++) {
    await newGame(page)
    const b = await cells(page)
    board = b
    const found = pick(b)
    if (found) return b
  }
  return null
}

function toSeconds(t: string): number {
  const m = t.match(/^(\d+):(\d{2})$/)
  if (!m) return -1
  return Number(m[1]) * 60 + Number(m[2])
}

// Wait until the on-screen timer has advanced to at least `seconds`.
async function waitTimerAtLeast(page: Page, seconds: number) {
  await expect
    .poll(
      async () => {
        const m = await page.evaluate(() => document.body.innerText.match(/Timer: (\d{2}:\d{2})/)?.[1])
        return m ? toSeconds(m) : 0
      },
      { timeout: 15000 },
    )
    .toBeGreaterThanOrEqual(seconds)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] initial load shows heading, New Game, zero timer, and mine counter', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Minesweeper Game' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
  await expect(page.getByText('Timer: 00:00')).toBeVisible()
  await expect(page.getByText(`Mines: ${MINES}`)).toBeVisible()
})

test('[A2] New Game generates a 9x9 grid of 81 cells and starts the timer', async ({ page }) => {
  await newGame(page)
  const board = await cells(page)
  expect(board.length).toBe(ROWS * COLS)
  const rows = new Set(board.map((c) => c.row))
  const cols = new Set(board.map((c) => c.col))
  expect(rows.size).toBe(ROWS)
  expect(cols.size).toBe(COLS)
  // the timer is now running: it advances past zero
  await waitTimerAtLeast(page, 1)
})

test('[A3] opening a safe empty cell flood-fills and reveals a 0', async ({ page }) => {
  const board = await boardWith(page, (b) => safeWithAdjacentMines(b, 0))
  expect(board, 'a board with a safe empty (0-neighbor) cell').not.toBeNull()
  const blank = safeWithAdjacentMines(board!, 0)!
  await clickCellByName(page, blank.name)
  // the opened cell shows 0
  await expect(page.getByRole('cell', { name: `revealed, 0, row ${blank.row}, column ${blank.col}` })).toBeVisible()
  // flood fill: more than one cell is revealed
  const revealed = (await cells(page)).filter((c) => c.isRevealed)
  expect(revealed.length).toBeGreaterThan(1)
})

test('[A4] opening a safe cell with three neighbors shows 3 and colors it red', async ({ page }) => {
  const board = await boardWith(page, (b) => safeWithAdjacentMines(b, 3))
  expect(board, 'a board with a safe cell having exactly 3 adjacent mines').not.toBeNull()
  const target = safeWithAdjacentMines(board!, 3)!
  await clickCellByName(page, target.name)
  const revealed = page.getByRole('cell', { name: `revealed, 3, row ${target.row}, column ${target.col}` })
  await expect(revealed).toBeVisible()
  await expect(revealed).toHaveText('3')
  // red color: the number is rendered in a red-ish color
  const color = await revealed.evaluate((el) => getComputedStyle(el).color)
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  expect(rgb, `revealed 3 must be red, got ${color}`).not.toBeNull()
  const [r, g, b] = [Number(rgb![1]), Number(rgb![2]), Number(rgb![3])]
  expect(r).toBeGreaterThan(g)
  expect(r).toBeGreaterThan(b)
  // a numbered cell is not flood-filled: at least one neighbor stays hidden
  const neighbors = neighborsOf(await cells(page), target.row, target.col)
  const stillHidden = neighbors.filter((n) => !n.isRevealed)
  expect(stillHidden.length).toBeGreaterThan(0)
})

test('[A5] opening a mine reveals it, turns it red, stops the timer, and shows Game Over', async ({ page }) => {
  const board = await boardWith(page, (b) => b.find((c) => c.isMine) ?? null)
  expect(board, 'a board with mines').not.toBeNull()
  const mine = board!.find((c) => c.isMine)!
  // let the timer run so a stop is observable, then capture the frozen value
  // before the click (reading it after the click could race the commit)
  await waitTimerAtLeast(page, 1)
  const timerBefore = await page.evaluate(() => document.body.innerText.match(/Timer: (\d{2}:\d{2})/)?.[1])
  await clickCellByName(page, mine.name)
  await expect(page.getByText('Game Over')).toBeVisible()
  // the mine is revealed with a red background
  const revealedMine = page.getByRole('cell', { name: new RegExp(`row ${mine.row}, column ${mine.col}`) })
  await expect(revealedMine).toBeVisible()
  const bg = await revealedMine.evaluate((el) => getComputedStyle(el).backgroundColor)
  const rgb = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  expect(rgb, `mine cell must have a red background, got ${bg}`).not.toBeNull()
  const [r, g, b] = [Number(rgb![1]), Number(rgb![2]), Number(rgb![3])]
  expect(r).toBeGreaterThan(g)
  expect(r).toBeGreaterThan(b)
  // the timer stopped: it equals the value captured just before the click
  const timerAfter = await page.evaluate(() => document.body.innerText.match(/Timer: (\d{2}:\d{2})/)?.[1])
  expect(timerAfter).toBe(timerBefore)
})

test('[A6] after Game Over the board is locked and further clicks change nothing', async ({ page }) => {
  const board = await boardWith(page, (b) => b.find((c) => c.isMine) ?? null)
  expect(board, 'a board with mines').not.toBeNull()
  const mine = board!.find((c) => c.isMine)!
  await clickCellByName(page, mine.name)
  await expect(page.getByText('Game Over')).toBeVisible()
  const snapshot = JSON.stringify(await cells(page))
  // click a couple of still-hidden cells; the board must not change
  const hidden = (await cells(page)).filter((c) => !c.isRevealed && !c.isFlagged)
  for (const h of hidden.slice(0, 2)) {
    await clickCellByName(page, h.name)
  }
  const after = JSON.stringify(await cells(page))
  expect(after).toBe(snapshot)
  await expect(page.getByText('Game Over')).toBeVisible()
})

test('[A7] clearing every safe cell wins, stops the timer, and updates Best Time', async ({ page }) => {
  const board0 = await boardWith(page, (b) => (mineCountOf(b) === MINES ? b : null))
  expect(board0, 'a full board').not.toBeNull()
  // reveal every safe cell one at a time (never a mine) until the board is cleared
  let board = board0!
  let guard = 0
  while (true) {
    const unrevealedSafe = safeCells(board)
    if (unrevealedSafe.length === 0) break
    await clickCellByName(page, unrevealedSafe[0].name)
    board = await cells(page)
    if (++guard > ROWS * COLS + 5) break
  }
  await expect(page.getByText('You Win')).toBeVisible()
  // the timer is stopped: it does not advance
  const timerAtWin = await page.evaluate(() => document.body.innerText.match(/Timer: (\d{2}:\d{2})/)?.[1])
  await page.waitForTimeout(1200)
  const timerLater = await page.evaluate(() => document.body.innerText.match(/Timer: (\d{2}:\d{2})/)?.[1])
  expect(timerLater).toBe(timerAtWin)
  // the win time is a real, non-zero duration
  expect(toSeconds(timerAtWin!)).toBeGreaterThan(0)
  // best time is now at most the win time (a new best, or an unchanged older best)
  const bestNow = await page.evaluate(() => document.body.innerText.match(/Best Time: (\d{2}:\d{2})/)?.[1])
  expect(bestNow, 'a Best Time is shown after winning').not.toBeNull()
  expect(toSeconds(bestNow!)).toBeLessThanOrEqual(toSeconds(timerAtWin!))
})

test('[A8] right-clicking a safe cell flags it and decreases the mine counter', async ({ page }) => {
  const board = await cells(page)
  const safe = safeCells(board)[0]
  expect(safe, 'board must contain safe cells').toBeDefined()
  await clickCellByName(page, safe.name, 'right')
  // the mine counter drops by one
  await expect(page.getByText(`Mines: ${MINES - 1}`)).toBeVisible()
  // the cell is now flagged
  await expect(page.getByRole('cell', { name: `flagged, row ${safe.row}, column ${safe.col}` })).toBeVisible()
})

test('[A9] reload keeps the revealed cells, the timer, and the mine count', async ({ page }) => {
  const board = await cells(page)
  // reveal a few safe cells (never a mine) so state changes
  const safe = safeCells(board)
  expect(safe.length).toBeGreaterThan(2)
  for (const s of safe.slice(0, 3)) {
    await clickCellByName(page, s.name)
  }
  // let the timer run to a non-zero second
  await waitTimerAtLeast(page, 2)
  const revealedBefore = (await cells(page)).filter((c) => c.isRevealed).length
  expect(revealedBefore).toBeGreaterThan(0)
  await page.reload()
  // revealed cells persist after reload
  const revealedAfter = (await cells(page)).filter((c) => c.isRevealed).length
  expect(revealedAfter).toBe(revealedBefore)
  // timer persisted: it is not reset to zero
  const timerAfter = await page.evaluate(() => document.body.innerText.match(/Timer: (\d{2}:\d{2})/)?.[1])
  expect(toSeconds(timerAfter!)).toBeGreaterThan(0)
  // mine count persisted
  await expect(page.getByText(`Mines: ${MINES}`)).toBeVisible()
})
