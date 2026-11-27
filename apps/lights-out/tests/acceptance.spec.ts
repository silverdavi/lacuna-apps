import { expect, test, type Locator, type Page } from '@playwright/test'

// Test notes say to count lit cells with locator('[aria-pressed="true"]');
// cells are buttons named "Cell row R, column C" with that attribute when lit.
const lit = (page: Page): Locator => page.locator('[aria-pressed="true"]')
const cell = (page: Page, r: number, c: number): Locator =>
  page.getByRole('button', { name: `Cell row ${r}, column ${c}` })

async function open(page: Page) {
  await page.goto('/')
}

async function solve(page: Page) {
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) {
      await cell(page, r, c).click()
    }
  }
}

test('[A1] first load shows the heading, Moves: 0 and the seed 42 board with 13 lit cells', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Lights Out' })).toBeVisible()
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await expect(lit(page)).toHaveCount(13)
})

test('[A2] clicking (1,1) turns it dark, lights (1,2) and (2,1), leaving 14 lit and Moves: 1', async ({ page }) => {
  await open(page)
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).not.toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 2, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(lit(page)).toHaveCount(14)
  await expect(page.getByText('Moves: 1')).toBeVisible()
})

test('[A3] clicking (1,2) toggles (1,1), (1,3) and (2,2) and shows Moves: 2', async ({ page }) => {
  await open(page)
  await cell(page, 1, 1).click()
  await cell(page, 1, 2).click()
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 3)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 2, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible()
})

test('[A4] clicking all 25 cells in order solves the board with 0 lit, Solved! and Moves: 25', async ({ page }) => {
  await open(page)
  await solve(page)
  await expect(lit(page)).toHaveCount(0)
  await expect(page.getByText('Solved!')).toBeVisible()
  await expect(page.getByText('Moves: 25')).toBeVisible()
})

test('[A5] after solving with 25 moves, New Game resets the board to the seed 42 pattern with Moves: 0 and no Solved!', async ({ page }) => {
  await open(page)
  await solve(page)
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(lit(page)).toHaveCount(13)
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await expect(page.getByText('Solved!')).not.toBeVisible()
})

test('[A6] Best: 25 appears after solving with 25 moves and stays 25 after a second 25-move solve', async ({ page }) => {
  await open(page)
  await solve(page)
  await expect(page.getByText('Best: 25')).toBeVisible()
  await page.getByRole('button', { name: 'New Game' }).click()
  await solve(page)
  await expect(page.getByText('Best: 25')).toBeVisible()
})

test('[A7] reloading after solving with 25 moves shows Best: 25, the seed 42 board and Moves: 0', async ({ page }) => {
  await open(page)
  await solve(page)
  await page.reload()
  await expect(page.getByText('Best: 25')).toBeVisible()
  await expect(lit(page)).toHaveCount(13)
  await expect(page.getByText('Moves: 0')).toBeVisible()
})

test('[A8] changing the Seed field to 7 and clicking New Game deals the 17-lit seed 7 board with Moves: 0', async ({ page }) => {
  await open(page)
  await page.getByLabel('Seed').fill('7')
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(lit(page)).toHaveCount(17)
  await expect(page.getByText('Moves: 0')).toBeVisible()
})
