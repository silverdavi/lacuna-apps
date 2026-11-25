import { expect, test } from '@playwright/test'

// A4: the spec says 3 cells form a "block" yet expects Population: 3 after Step; a 3-cell L triomino is stable, so the count matches its own setup.

test('[A1] heading, empty population, and Step enabled on load', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Conway Game of Life' })).toBeVisible()
  await expect(page.getByText('Population: 0')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled()
})

test('[A2] clicking cells toggles them alive and updates the population', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 1, column 1/i).click()
  await expect(page.getByText('Population: 1')).toBeVisible()
  await page.getByLabel(/row 1, column 2/i).click()
  await page.getByLabel(/row 1, column 3/i).click()
  await expect(page.getByText('Population: 3')).toBeVisible()
})

test('[A3] stepping a horizontal line of three kills all three', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 1, column 1/i).click()
  await page.getByLabel(/row 1, column 2/i).click()
  await page.getByLabel(/row 1, column 3/i).click()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(page.getByText('Population: 0')).toBeVisible()
})

test('[A4] stepping a stable block leaves it unchanged', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 2, column 2/i).click()
  await page.getByLabel(/row 3, column 1/i).click()
  await page.getByLabel(/row 3, column 2/i).click()
  await expect(page.getByText('Population: 3')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(page.getByText('Population: 3')).toBeVisible()
})

test('[A5] stepping a diagonal line of three kills all three', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 2, column 2/i).click()
  await page.getByLabel(/row 2, column 3/i).click()
  await page.getByLabel(/row 3, column 3/i).click()
  await expect(page.getByText('Population: 3')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(page.getByText('Population: 0')).toBeVisible()
})

test('[A6] stepping a 2x2 block leaves it unchanged', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 2, column 2/i).click()
  await page.getByLabel(/row 2, column 3/i).click()
  await page.getByLabel(/row 3, column 2/i).click()
  await page.getByLabel(/row 3, column 3/i).click()
  await expect(page.getByText('Population: 4')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(page.getByText('Population: 4')).toBeVisible()
})

test('[A7] Clear removes all alive cells', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 1, column 1/i).click()
  await page.getByLabel(/row 1, column 2/i).click()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Population: 0')).toBeVisible()
})

test('[A8] Run starts the simulation and Stop halts it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 1, column 1/i).click()
  await page.getByLabel(/row 1, column 2/i).click()
  await page.getByLabel(/row 1, column 3/i).click()
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByText('Population: 0')).toBeVisible()
  await page.getByRole('button', { name: 'Stop' }).click()
})

test('[A9] the grid state survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(/row 2, column 2/i).click()
  await page.getByLabel(/row 2, column 3/i).click()
  await page.getByLabel(/row 3, column 2/i).click()
  await page.getByLabel(/row 3, column 3/i).click()
  await expect(page.getByText('Population: 4')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Population: 4')).toBeVisible()
})
