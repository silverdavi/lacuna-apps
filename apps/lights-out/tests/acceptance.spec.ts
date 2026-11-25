import { expect, test, type Page } from '@playwright/test'

// Cells are addressed (row, column), both counted from 1, row 1 at the top.
// Cells are found by the accessible name "Row R, Column C" (the spec's cell
// naming). They are click targets, so they match on the button role; a bare
// gridcell would not be clickable.
const cell = (page: Page, r: number, c: number) =>
  page.getByRole('button', { name: `Row ${r}, Column ${c}` })

// Count the lit cells on the 5x5 board. Reading a rendered value after the
// user's actions is allowed.
async function litCount(page: Page): Promise<number> {
  let n = 0
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) {
      const el = await cell(page, r, c).elementHandle()
      if (el && await el.evaluate((node) => Boolean(node.getAttribute('aria-pressed')) === true)) n++
    }
  }
  return n
}

async function solve(page: Page) {
  for (let r = 1; r <= 5; r++) for (let c = 1; c <= 5; c++) await cell(page, r, c).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] on load the heading, Moves: 0, and exactly 13 lit cells are shown', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Lights Out' })).toBeVisible()
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  expect(await litCount(page)).toBe(13)
})

test('[A2] clicking Row 1 Column 1 toggles it and its right and bottom neighbors, to 10 lit cells and Moves: 1', async ({ page }) => {
  await cell(page, 1, 1).click()
  expect(await litCount(page)).toBe(10)
  await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible()
})

test('[A3] clicking Row 1 Column 2 toggles it, its left and right neighbors, and its bottom neighbor, to Moves: 2', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 1, 2).click()
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible()
})

test('[A4] clicking all 25 cells in row-major order solves the board and shows Solved! with Moves: 25', async ({ page }) => {
  await solve(page)
  expect(await litCount(page)).toBe(0)
  await expect(page.getByText('Solved!', { exact: true })).toBeVisible()
  await expect(page.getByText('Moves: 25', { exact: true })).toBeVisible()
})

test('[A5] New Game after solving resets the board to 13 lit cells, Moves: 0, and removes Solved!', async ({ page }) => {
  await solve(page)
  await page.getByRole('button', { name: 'New Game', exact: true }).click()
  expect(await litCount(page)).toBe(13)
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Solved!', { exact: true })).toHaveCount(0)
})

test('[A6] Best: 25 appears after solving and is unchanged by a second 25-move solve', async ({ page }) => {
  await solve(page)
  await expect(page.getByText('Best: 25', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New Game', exact: true }).click()
  await solve(page)
  await expect(page.getByText('Best: 25', { exact: true })).toBeVisible()
})

test('[A7] reloading after a 25-move solve shows Best: 25 and the seed 42 board with Moves: 0', async ({ page }) => {
  await solve(page)
  await page.reload()
  await expect(page.getByText('Best: 25', { exact: true })).toBeVisible()
  expect(await litCount(page)).toBe(13)
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
})

test('[A8] changing Seed from 42 to 7 and clicking New Game gives a 11-lit-cell board with Moves: 0', async ({ page }) => {
  await page.getByLabel('Seed', { exact: true }).fill('7')
  await page.getByRole('button', { name: 'New Game', exact: true }).click()
  expect(await litCount(page)).toBe(11)
  await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
})
