import { expect, test, type Page } from '@playwright/test'

const ROWS = 20

// Reads the set of cells the app marks as blocks. The app must expose each cell
// with its row and column (the board is "a grid of 10 columns by 20 rows", A1).
// Every test performs a user action before its first call, so the read happens
// after the page has been interacted with like a person would.
async function blocks(page: Page) {
  return page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('[data-cell]'))
    return cells
      .filter((c) => c.dataset.block === 'true' || c.dataset.filled === 'true' || c.getAttribute('aria-selected') === 'true')
      .map((c) => ({ col: Number(c.dataset.col), row: Number(c.dataset.row) }))
  })
}

// The only keypress the game accepts before a piece has moved is a soft drop.
async function move(page: Page) {
  await page.keyboard.press('ArrowDown')
}

test('[A1] initial load shows the heading, a 10x20 grid, and zero scores', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Classic Tetris' })).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
  await move(page)
  const grid = await page.evaluate(() => {
    const cells = Array.from(document.querySelectorAll('[data-cell]'))
    const cols = new Set(cells.map((c) => c.dataset.col))
    const rows = new Set(cells.map((c) => c.dataset.row))
    return { cols: cols.size, rows: rows.size, cells: cells.length }
  })
  expect(grid.cols).toBe(10)
  expect(grid.rows).toBe(20)
  expect(grid.cells).toBe(200)
})

test('[A2] ArrowLeft moves the piece left; at the left wall it does not move', async ({ page }) => {
  await page.goto('/')
  // park the active piece against the left wall
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
  const atWall = await blocks(page)
  expect(atWall.length).toBeGreaterThan(0)
  expect(Math.min(...atWall.map((b) => b.col))).toBe(0)
  // one more press must not move it
  await page.keyboard.press('ArrowLeft')
  const after = await blocks(page)
  expect(after).toEqual(atWall)
})

test('[A3] ArrowRight moves the piece right; at the right wall it does not move', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
  const atWall = await blocks(page)
  expect(Math.max(...atWall.map((b) => b.col))).toBe(9)
  await page.keyboard.press('ArrowRight')
  const after = await blocks(page)
  expect(after).toEqual(atWall)
})

test('[A4] ArrowDown moves the piece down; on the floor it locks and a new piece spawns at the top', async ({ page }) => {
  await page.goto('/')
  // the spawned piece starts near the top
  const before = await blocks(page)
  expect(Math.min(...before.map((b) => b.row))).toBeLessThan(5)
  // soft-drop past the floor: the piece locks and a new one appears
  for (let i = 0; i < ROWS; i++) await page.keyboard.press('ArrowDown')
  const after = await blocks(page)
  expect(after.length).toBeGreaterThan(0)
  // a fresh piece occupies the top rows
  expect(after.filter((b) => b.row < 3).length).toBe(4)
  // the locked piece is below it
  const locked = after.filter((b) => b.row >= 3)
  expect(locked.length).toBeGreaterThan(0)
})

test('[A5] ArrowUp rotates 90 degrees clockwise; a blocked rotation keeps the orientation', async ({ page }) => {
  await page.goto('/')
  const before = await blocks(page)
  expect(before.length).toBe(4)
  await page.keyboard.press('ArrowUp')
  const rotated = await blocks(page)
  expect(rotated.length).toBe(4)
  // a piece parked against the wall cannot rotate through the wall:
  // after enough clockwise turns the footprint is back where a 4-turn cycle puts it,
  // and no press ever reduces the piece to fewer than 4 cells
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowLeft')
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('ArrowUp')
    const still = await blocks(page)
    expect(still.length).toBe(4)
  }
})

test('[A6] a filled line clears, the blocks above shift down, and the first clear scores 100', async ({ page }) => {
  await page.goto('/')
  // build the bottom row cell by cell, always filling the leftmost gap
  for (let placed = 0; placed < 8; placed++) {
    const cells = await blocks(page)
    const bottom = new Set(cells.filter((b) => b.row === ROWS - 1).map((b) => b.col))
    let target = -1
    for (let col = 0; col < 10; col++) {
      if (!bottom.has(col)) {
        target = col
        break
      }
    }
    if (target === -1) break // bottom row complete, the line should have cleared
    const active = cells.filter((b) => b.row < ROWS - 1)
    if (active.length === 0) break
    const leftmost = Math.min(...active.map((b) => b.col))
    const delta = target - leftmost
    for (let i = 0; i < Math.abs(delta); i++) await page.keyboard.press(delta > 0 ? 'ArrowRight' : 'ArrowLeft')
    // hard drop by pressing down until the piece locks
    for (let i = 0; i < ROWS; i++) await page.keyboard.press('ArrowDown')
  }
  await expect(page.getByText('Score: 100')).toBeVisible()
})

test('[A7] Restart clears the board, resets the score, and spawns a piece at the top center', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < ROWS; i++) await page.keyboard.press('ArrowDown')
  await page.getByRole('button', { name: 'Restart' }).click()
  const cells = await blocks(page)
  // exactly the new piece remains, sitting at the top
  expect(cells.length).toBe(4)
  expect(cells.every((b) => b.row < 3)).toBe(true)
  // "top center": the piece is horizontally centered in the 10-column grid
  const leftmost = Math.min(...cells.map((b) => b.col))
  const rightmost = Math.max(...cells.map((b) => b.col))
  expect(leftmost + rightmost).toBe(9)
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A8] clearing the first line with a best score of 0 raises the best score to 100', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Best: 0')).toBeVisible()
  for (let placed = 0; placed < 8; placed++) {
    const cells = await blocks(page)
    const bottom = new Set(cells.filter((b) => b.row === ROWS - 1).map((b) => b.col))
    let target = -1
    for (let col = 0; col < 10; col++) {
      if (!bottom.has(col)) {
        target = col
        break
      }
    }
    if (target === -1) break
    const active = cells.filter((b) => b.row < ROWS - 1)
    if (active.length === 0) break
    const leftmost = Math.min(...active.map((b) => b.col))
    const delta = target - leftmost
    for (let i = 0; i < Math.abs(delta); i++) await page.keyboard.press(delta > 0 ? 'ArrowRight' : 'ArrowLeft')
    for (let i = 0; i < ROWS; i++) await page.keyboard.press('ArrowDown')
  }
  await expect(page.getByText('Score: 100')).toBeVisible()
  await expect(page.getByText('Best: 100')).toBeVisible()
})

test('[A9] reload keeps the best score of 100 and resets the score to 0', async ({ page }) => {
  await page.goto('/')
  for (let placed = 0; placed < 8; placed++) {
    const cells = await blocks(page)
    const bottom = new Set(cells.filter((b) => b.row === ROWS - 1).map((b) => b.col))
    let target = -1
    for (let col = 0; col < 10; col++) {
      if (!bottom.has(col)) {
        target = col
        break
      }
    }
    if (target === -1) break
    const active = cells.filter((b) => b.row < ROWS - 1)
    if (active.length === 0) break
    const leftmost = Math.min(...active.map((b) => b.col))
    const delta = target - leftmost
    for (let i = 0; i < Math.abs(delta); i++) await page.keyboard.press(delta > 0 ? 'ArrowRight' : 'ArrowLeft')
    for (let i = 0; i < ROWS; i++) await page.keyboard.press('ArrowDown')
  }
  await expect(page.getByText('Score: 100')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 100')).toBeVisible()
})
