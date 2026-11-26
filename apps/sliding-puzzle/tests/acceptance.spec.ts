import { expect, test, type Page } from '@playwright/test'

// The board is a 4x4 grid; tiles are numbered 1..15 and the empty cell is 16
// (bottom right). The whole board is read cell by cell in reading order.
const moves = (page: Page, n: number) => page.getByText(`Moves: ${n}`, { exact: true })
const best = (page: Page, n: number) => page.getByText(`Best: ${n}`, { exact: true })
const solvedRow = (page: Page, movesValue: number) =>
  page.getByRole('table').getByRole('row').filter({ hasText: 'Solved' }).filter({ hasText: String(movesValue) })

// Read the whole board: the tile number of each of the 16 positions in reading order,
// '' for the empty position. This reads rendered DOM after user actions, it never
// mutates the page or its storage.
async function readBoard(page: Page): Promise<string[]> {
  const cells = await page.getByRole('grid', { name: 'Board', exact: true }).getByRole('gridcell').all()
  expect(cells.length).toBe(16)
  const out: string[] = []
  for (const cell of cells) {
    const text = (await cell.textContent())?.trim()
    out.push(text === '' || text === undefined ? '' : text)
  }
  return out
}

async function solvedBoard(page: Page) {
  expect(await readBoard(page)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', ''])
}

// Press an arrow key and assert the move counter advanced by exactly 1.
async function arrowMove(page: Page, key: string, from: number, to: number) {
  await page.keyboard.press(key)
  await expect(moves(page, to)).toBeVisible()
  await expect(moves(page, from)).toHaveCount(0)
}

// A move that must be rejected by the rules.
async function invalidMove(page: Page, key: string) {
  await page.keyboard.press(key)
  await expect(moves(page, 0)).toBeVisible()
  await solvedBoard(page)
}

test('[A1] on first load the heading, the counters at zero, and the solved board are shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sliding Tile Puzzle', exact: true })).toBeVisible()
  await expect(moves(page, 0)).toBeVisible()
  await expect(best(page, 0)).toBeVisible()
  await solvedBoard(page)
})

test('[A2] seed 42 with New game shuffles to tile 1 top-left and empty bottom-right', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New game', exact: true }).click()
  const board = await readBoard(page)
  expect(board[0], 'tile 1 in the top-left cell').toBe('1')
  expect(board[15], 'empty cell in the bottom-right cell').toBe('')
})

test('[A3] from the solved board ArrowUp slides tile 12 into the empty space and counts one move', async ({ page }) => {
  await page.goto('/')
  await arrowMove(page, 'ArrowUp', 0, 1)
  await solvedBoard(page)
})

test('[A4] from the solved board ArrowLeft is rejected: board and counter unchanged', async ({ page }) => {
  await page.goto('/')
  await invalidMove(page, 'ArrowLeft')
})

test('[A5] Reset after moves from a shuffled board restores the solved board and Moves: 0', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New game', exact: true }).click()
  await arrowMove(page, 'ArrowRight', 0, 1)
  await arrowMove(page, 'ArrowDown', 1, 2)
  await arrowMove(page, 'ArrowLeft', 2, 3)
  await arrowMove(page, 'ArrowUp', 3, 4)
  await arrowMove(page, 'ArrowRight', 4, 5)
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  await solvedBoard(page)
  await expect(moves(page, 0)).toBeVisible()
})

test('[A6] best improves to the lower of two solved runs: 10, then 8', async ({ page }) => {
  await page.goto('/')
  // First run: 10 legal moves, no reset.
  const seq1: [string, number, number][] = [
    ['ArrowUp', 0, 1],
    ['ArrowUp', 1, 2],
    ['ArrowUp', 2, 3],
    ['ArrowUp', 3, 4],
    ['ArrowLeft', 4, 5],
    ['ArrowLeft', 5, 6],
    ['ArrowDown', 6, 7],
    ['ArrowDown', 7, 8],
    ['ArrowRight', 8, 9],
    ['ArrowRight', 9, 10],
  ]
  for (const [key, from, to] of seq1) await arrowMove(page, key, from, to)
  await expect(moves(page, 10)).toBeVisible()
  await expect(best(page, 10)).toBeVisible()

  // Second run: 8 legal moves from the reset solved board, fewer than 10.
  await page.getByRole('button', { name: 'Reset', exact: true }).click()
  const seq2: [string, number, number][] = [
    ['ArrowUp', 0, 1],
    ['ArrowUp', 1, 2],
    ['ArrowUp', 2, 3],
    ['ArrowUp', 3, 4],
    ['ArrowLeft', 4, 5],
    ['ArrowLeft', 5, 6],
    ['ArrowDown', 6, 7],
    ['ArrowDown', 7, 8],
  ]
  for (const [key, from, to] of seq2) await arrowMove(page, key, from, to)
  await expect(best(page, 8)).toBeVisible()
})

test('[A7] Copy state shows the "Board state copied to clipboard" toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await arrowMove(page, 'ArrowUp', 0, 1)
  await arrowMove(page, 'ArrowLeft', 1, 2)
  await arrowMove(page, 'ArrowUp', 2, 3)
  await page.getByRole('button', { name: 'Copy state', exact: true }).click()
  await expect(page.getByText('Board state copied to clipboard', { exact: true })).toBeVisible()
})

test('[A8] the Stats tab table records a solved run with its move count', async ({ page }) => {
  await page.goto('/')
  const seq: [string, number, number][] = [
    ['ArrowUp', 0, 1],
    ['ArrowUp', 1, 2],
    ['ArrowUp', 2, 3],
    ['ArrowUp', 3, 4],
    ['ArrowLeft', 4, 5],
    ['ArrowLeft', 5, 6],
    ['ArrowDown', 6, 7],
    ['ArrowDown', 7, 8],
    ['ArrowRight', 8, 9],
    ['ArrowRight', 9, 10],
    ['ArrowDown', 10, 11],
    ['ArrowRight', 11, 12],
  ]
  for (const [key, from, to] of seq) await arrowMove(page, key, from, to)
  await page.getByRole('tab', { name: 'Stats', exact: true }).click()
  await expect(solvedRow(page, 12)).toBeVisible()
})

test('[A9] a reload keeps the board configuration and the move counter', async ({ page }) => {
  await page.goto('/')
  await arrowMove(page, 'ArrowUp', 0, 1)
  await arrowMove(page, 'ArrowLeft', 1, 2)
  await page.reload()
  await expect(moves(page, 2)).toBeVisible()
  await solvedBoard(page)
})
