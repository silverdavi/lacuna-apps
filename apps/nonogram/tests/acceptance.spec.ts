import { expect, test, type Page } from '@playwright/test'

// Cells are addressed (row, column), both counted from 1, row 1 at the top.
// Cells are buttons named "Cell row R, column C" (exact, per the spec).
const cell = (page: Page, r: number, c: number) => page.getByRole('button', { name: `Cell row ${r}, column ${c}`, exact: true })

// Seed 1 solution, rows top to bottom: XXX..; X.X..; X.XX.; ...X.; .XXXX.
const SOLUTION: [number, number][] = [
  [1, 1], [1, 2], [1, 3],
  [2, 1], [2, 3],
  [3, 1], [3, 3], [3, 4],
  [4, 4],
  [5, 2], [5, 3], [5, 4], [5, 5],
]

async function start(page: Page, seed = '1') {
  await page.goto('/')
  await page.getByLabel('Seed', { exact: true }).fill(seed)
  await page.getByRole('button', { name: 'New puzzle', exact: true }).click()
}

async function fillAll(page: Page) {
  for (const [r, c] of SOLUTION) await cell(page, r, c).click()
}

test('[A1] on first load the heading is shown and the page says to enter a seed', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Nonogram Puzzle', exact: true })).toBeVisible()
  await expect(page.getByText('Enter a seed to start', { exact: true })).toBeVisible()
})

test('[A2] seed 1 loads a 5x5 grid with row clue 3 for row 1 and column clue 3 for column 1', async ({ page }) => {
  await start(page)
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) {
      await expect(cell(page, r, c)).toBeVisible()
    }
  }
  await expect(page.getByRole('button', { name: `Cell row 6, column 1`, exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: `Cell row 1, column 6`, exact: true })).toHaveCount(0)
  await expect(page.getByText('3', { exact: true })).toHaveCount(2)
})

test('[A3] clicking cell row 1 column 1 fills it and the score becomes 1', async ({ page }) => {
  await start(page)
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveText('X')
  await expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
})

test('[A4] clicking cell row 1 column 2 after row 1 column 1 gives two filled cells', async ({ page }) => {
  await start(page)
  await cell(page, 1, 1).click()
  await cell(page, 1, 2).click()
  await expect(cell(page, 1, 2)).toHaveText('X')
  await expect(page.getByText('Score: 2', { exact: true })).toBeVisible()
})

test('[A5] clicking a filled cell again empties it and the score goes back to 0', async ({ page }) => {
  await start(page)
  await cell(page, 1, 1).click()
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveText('-')
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A6] checking with one wrong fill reports 1 right and 12 missing', async ({ page }) => {
  await start(page)
  await cell(page, 1, 1).click()
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.getByText('Not solved: 1 of 13 filled cells are right and 12 are missing', { exact: true })).toBeVisible()
})

test('[A7] filling the 13 solution cells and checking shows Solved! and Best: 13', async ({ page }) => {
  await start(page)
  await fillAll(page)
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.getByText('Solved!', { exact: true })).toBeVisible()
  await expect(page.getByText('Best: 13', { exact: true })).toBeVisible()
})

test('[A8] after solving seed 1 the History tab lists Seed 1 - Solved', async ({ page }) => {
  await start(page)
  await fillAll(page)
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.getByText('Solved!', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  await expect(page.getByText('Seed 1 - Solved', { exact: true })).toBeVisible()
})

test('[A9] a reload keeps the filled cell and the score', async ({ page }) => {
  await start(page)
  await cell(page, 1, 1).click()
  await expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
  await page.reload()
  await expect(cell(page, 1, 1)).toHaveText('X')
  await expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
})
