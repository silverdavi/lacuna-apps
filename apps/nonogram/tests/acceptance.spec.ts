import { expect, test, type Page } from '@playwright/test'

// Cells are addressed (row, column), both counted from 1, row 1 at the top.
// Cells are found as gridcells named "Row R, Column C" (the spec's cell naming).
const cell = (page: Page, r: number, c: number) => page.getByRole('gridcell', { name: `Row ${r}, Column ${c}`, exact: true })

async function loadSeed(page: Page, seed: string) {
  await page.getByLabel('Seed', { exact: true }).fill(seed)
  await page.getByRole('button', { name: 'New puzzle', exact: true }).click()
}

test('[A1] on first load the heading and "Enter a seed to start" are shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Nonogram Puzzle', exact: true })).toBeVisible()
  await expect(page.getByText('Enter a seed to start')).toBeVisible()
})

test('[A2] loading seed 1 shows a 5x5 grid with row 1 clue 3 and column 1 clue 3', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  const grid = page.getByRole('grid')
  await expect(grid.getByRole('gridcell')).toHaveCount(25)
  await expect(grid.getByRole('row')).toHaveCount(5)
  await expect(grid.getByRole('columnheader').first()).toContainText('3')
  await expect(grid.getByRole('row').first().getByRole('rowheader')).toContainText('3')
})

test('[A3] filling row 1 column 1 shows X and Score: 1', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toContainText('X')
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A4] filling row 1 column 1 then row 1 column 2 shows Score: 2', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  await cell(page, 1, 1).click()
  await cell(page, 1, 2).click()
  await expect(cell(page, 1, 2)).toContainText('X')
  await expect(page.getByText('Score: 2')).toBeVisible()
})

test('[A5] clicking a filled cell toggles it empty and shows Score: 0', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  await cell(page, 1, 1).click()
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toContainText('-')
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A6] checking with row 1 column 1 filled reports Incorrect: 1 cell(s) wrong', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  await cell(page, 1, 1).click()
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.getByText('Incorrect: 1 cell(s) wrong')).toBeVisible()
})

// The spec's solution for seed 1 is not given and the clues do not determine it, so filling every
// cell is the one pattern that makes "Check" show Solved! with Best: 25.
test('[A7] filling every cell and checking shows Solved! and Best: 25', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) await cell(page, r, c).click()
  }
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.getByText('Solved!')).toBeVisible()
  await expect(page.getByText('Best: 25')).toBeVisible()
})

test('[A8] after solving seed 1 the History tab lists Seed 1 - Solved', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  for (let r = 1; r <= 5; r++) {
    for (let c = 1; c <= 5; c++) await cell(page, r, c).click()
  }
  await page.getByRole('button', { name: 'Check', exact: true }).click()
  await expect(page.getByText('Solved!')).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  await expect(page.getByText('Seed 1 - Solved')).toBeVisible()
})

test('[A9] a reload keeps the filled cell and the score', async ({ page }) => {
  await page.goto('/')
  await loadSeed(page, '1')
  await cell(page, 1, 1).click()
  await page.reload()
  await expect(cell(page, 1, 1)).toContainText('X')
  await expect(page.getByText('Score: 1')).toBeVisible()
})
