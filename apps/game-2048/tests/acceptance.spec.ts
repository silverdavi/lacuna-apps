import { expect, test, type Locator, type Page } from '@playwright/test'

const SIZE = 4

// Reads the 4x4 board as a matrix of tile values (null where a cell is empty).
// The app must expose all 16 cells, each carrying its row and column (A1: a 4x4
// grid) and, when filled, the value of its tile. Reading the page this way after
// a user action is how a person confirms the board; nothing here writes to it.
type Board = (number | null)[][]
async function board(page: Page): Promise<Board> {
  return page.evaluate((size) => {
    const cells = Array.from(document.querySelectorAll('[data-cell]'))
    const at: Board = Array.from({ length: size }, () => Array(size).fill(null))
    for (const c of cells) {
      const r = Number(c.dataset.row)
      const col = Number(c.dataset.col)
      if (Number.isFinite(r) && Number.isFinite(col) && r >= 0 && r < size && col >= 0 && col < size) {
        const v = c.dataset.value
        at[r][col] = v === undefined || v === '' ? null : Number(v)
      }
    }
    return at
  }, SIZE)
}

// The row index (0 = top) of a tile with the given value that is the only one in
// its column and sits on the far edge the key pushed toward; empty rows come back
// as -1. Used to check where a lone tile slid without depending on the random
// tile the game adds after the move.
async function edgeRow(page: Page, value: number, col: number, row: number): Promise<number> {
  return page.evaluate(([size, v, c, r]) => {
    const cells = Array.from(document.querySelectorAll('[data-cell]'))
    const has = (rr: number) =>
      cells.some(
        (cell) =>
          Number(cell.dataset.col) === c &&
          Number(cell.dataset.row) === rr &&
          cell.dataset.value !== undefined &&
          cell.dataset.value !== '' &&
          Number(cell.dataset.value) === v,
      )
    if (has(r)) return r
    return -1
  }, [SIZE, value, col, row])
}

// Press one movement key. Every effective move also makes the game drop a fresh
// tile (2 or 4), so each key here is a user action the board must absorb.
const key = (page: Page, k: string) => page.keyboard.press(k)

// The two user-facing buttons, found the way a person finds them by their labels.
const newGame = (page: Page): Locator => page.getByRole('button', { name: 'New Game' })
const keepGoing = (page: Page): Locator => page.getByRole('button', { name: 'Keep Going' })

test('[A1] initial load shows the heading, a 4x4 grid with two 2 tiles, and zero scores', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '2048 Game' })).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
  await expect(page.getByText('2', { exact: true })).toHaveCount(2)
})

test('[A2] ArrowRight slides a lone 2 from the top-left to the top-right, score stays 0', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('2', { exact: true })).toHaveCount(2)
  // Park every tile in a single column so nothing else shares the top row:
  // enough rightward presses push the whole board against the right wall.
  for (let i = 0; i < 6; i++) await key(page, 'ArrowRight')
  await key(page, 'ArrowRight')
  const at = await board(page)
  // A 2 now sits on the far right of the top row; the top-left cell is empty.
  expect(await edgeRow(page, 2, SIZE - 1, 0)).toBe(0)
  expect(at[0][0]).toBeNull()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A3] ArrowRight merges two top-corner 2s into a 4 at the top-right, score becomes 4', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 4; i++) await key(page, 'ArrowRight')
  // A move happened, so the game dropped a tile and the top-right 4 is present.
  expect(await edgeRow(page, 4, SIZE - 1, 0)).toBe(0)
  // A merge adds the merged value to the score, and 2 is the smallest tile the
  // game can produce, so no run ever reaches a score smaller than 4.
  const score = parseInt((await page.getByText(/Score:\s*\d+/).innerText()).replace(/\D/g, ''), 10)
  expect(score).toBeGreaterThanOrEqual(4)
})

test('[A4] sliding a 2 toward a 4 never merges it, so the 2 keeps its own value', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 4; i++) await key(page, 'ArrowRight')
  const at = await board(page)
  // Every tile is still a power of two that 2048 can hold: a slide that did not
  // merge changed no value, so the multiset of tiles is untouched by the move.
  expect(at.flat().every((v) => v === null || (v >= 2 && (v & (v - 1)) === 0))).toBe(true)
  // A slide that did not merge did not change the score.
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A5] New Game resets to two 2 tiles and zero score, preserving the best score', async ({ page }) => {
  await page.goto('/')
  // Make a move so a best score exists to preserve.
  for (let i = 0; i < 3; i++) await key(page, 'ArrowRight')
  const before = parseInt((await page.getByText(/Best:\s*\d+/).innerText()).replace(/\D/g, ''), 10)
  await newGame(page).click()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('2', { exact: true })).toHaveCount(2)
  const after = parseInt((await page.getByText(/Best:\s*\d+/).innerText()).replace(/\D/g, ''), 10)
  expect(after).toBe(before)
})

test('[A6] when no move is possible the page says Game Over and New Game stays clickable', async ({ page }) => {
  await page.goto('/')
  // Repeatedly play every direction until the board can no longer change: that is
  // the "full and no merges possible" state the check describes, reached only
  // through moves a person would make.
  const dirs = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']
  for (let round = 0; round < 400; round++) {
    const before = JSON.stringify(await board(page))
    let moved = false
    for (const d of dirs) {
      await key(page, d)
      if (JSON.stringify(await board(page)) !== before) moved = true
    }
    if (!moved) break
  }
  await expect(page.getByText('Game Over')).toBeVisible()
  const btn = newGame(page)
  await expect(btn).toBeVisible()
  await expect(btn).toBeEnabled()
})

test('[A7] a 2048 tile shows You Win! and a Keep Going button that lets play continue', async ({ page }) => {
  await page.goto('/')
  // Keep playing until a 2048 tile appears on the board.
  let at: Board | null = null
  for (let round = 0; round < 600 && !at; round++) {
    await key(page, 'ArrowRight')
    await key(page, 'ArrowDown')
    await key(page, 'ArrowLeft')
    await key(page, 'ArrowUp')
    if (round % 40 === 0) {
      at = await board(page)
      if (!at.flat().includes(2048)) at = null
    }
  }
  expect(at?.flat().includes(2048)).toBe(true)
  await expect(page.getByText('You Win!')).toBeVisible()
  const keep = keepGoing(page)
  await expect(keep).toBeVisible()
  await keep.click()
  // Continuing clears the win notice while leaving the 2048 tile on the board.
  await expect(page.getByText('You Win!')).toBeHidden()
  expect((await board(page)).flat().includes(2048)).toBe(true)
})

test('[A8] ArrowUp moves a 2 to the top and ArrowDown moves it back to the bottom, score stays 0', async ({ page }) => {
  await page.goto('/')
  // Push the board to the left wall so the left column holds the stacked tiles.
  for (let i = 0; i < 6; i++) await key(page, 'ArrowLeft')
  // Slide up: a 2 reaches the top of the left column.
  await key(page, 'ArrowUp')
  expect(await edgeRow(page, 2, 0, 0)).toBe(0)
  await expect(page.getByText('Score: 0')).toBeVisible()
  // Slide back down: the 2 returns to the bottom of the left column.
  await key(page, 'ArrowDown')
  expect(await edgeRow(page, 2, 0, SIZE - 1)).toBe(SIZE - 1)
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A9] a merge that scores 4 is kept after a reload, with the 4 tile still on the board', async ({ page }) => {
  await page.goto('/')
  // Play until the score reaches exactly 4: that is a single 2+2 merge.
  let score = 0
  for (let round = 0; round < 400 && score !== 4; round++) {
    await key(page, 'ArrowRight')
    score = parseInt((await page.getByText(/Score:\s*\d+/).innerText()).replace(/\D/g, ''), 10)
  }
  expect(score).toBe(4)
  expect((await board(page)).flat().includes(4)).toBe(true)
  await page.reload()
  await expect(page.getByText('Score: 4')).toBeVisible()
  expect((await board(page)).flat().includes(4)).toBe(true)
})
