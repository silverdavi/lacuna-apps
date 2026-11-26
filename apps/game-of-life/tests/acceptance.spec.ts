import { expect, test, type Page } from '@playwright/test'

const cell = (page: Page, row: number, col: number) =>
  page.getByRole('button', { name: `Cell row ${row}, column ${col}` })

async function setGrid(page: Page, alive: Array<[number, number]>) {
  for (const [row, col] of alive) {
    await cell(page, row, col).click()
  }
}

test('[A1] page shows heading, population 0 and an enabled Step button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Conway Game of Life' })).toBeVisible()
  await expect(page.getByText('Population: 0')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled()
})

test('[A2] clicking cells toggles them alive and population counts them', async ({ page }) => {
  await page.goto('/')
  await cell(page, 1, 1).click()
  await expect(page.getByText('Population: 1')).toBeVisible()
  await cell(page, 1, 2).click()
  await cell(page, 1, 3).click()
  await expect(page.getByText('Population: 3')).toBeVisible()
})

test('[A3] step of top-edge row of three leaves (1,2) and (2,2) alive', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[1, 1], [1, 2], [1, 3]])
  await expect(page.getByText('Population: 3')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(cell(page, 1, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 2, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 1, 1)).toHaveAttribute('aria-pressed', 'false')
  await expect(cell(page, 1, 3)).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Population: 2')).toBeVisible()
})

test('[A4] L-tromino grows into a stable 2x2 block', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[2, 2], [3, 1], [3, 2]])
  await expect(page.getByText('Population: 3')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  for (const [row, col] of [[2, 1], [2, 2], [3, 1], [3, 2]] as Array<[number, number]>) {
    await expect(cell(page, row, col)).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByText('Population: 4')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(page.getByText('Population: 4')).toBeVisible()
})

test('[A5] step of a three-cell diagonal leaves only the middle cell', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[2, 2], [3, 3], [4, 4]])
  await expect(page.getByText('Population: 3')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  await expect(cell(page, 3, 3)).toHaveAttribute('aria-pressed', 'true')
  await expect(cell(page, 2, 2)).toHaveAttribute('aria-pressed', 'false')
  await expect(cell(page, 4, 4)).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Population: 1')).toBeVisible()
})

test('[A6] 2x2 block is unchanged by a step', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[2, 2], [2, 3], [3, 2], [3, 3]])
  await expect(page.getByText('Population: 4')).toBeVisible()
  await page.getByRole('button', { name: 'Step' }).click()
  for (const [row, col] of [[2, 2], [2, 3], [3, 2], [3, 3]] as Array<[number, number]>) {
    await expect(cell(page, row, col)).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByText('Population: 4')).toBeVisible()
})

test('[A7] Clear removes all alive cells', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[2, 2], [2, 3], [3, 2], [3, 3]])
  await expect(page.getByText('Population: 4')).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Population: 0')).toBeVisible()
  await expect(cell(page, 2, 2)).toHaveAttribute('aria-pressed', 'false')
})

test('[A8] Run evolves the simulation to extinction and Stop halts it', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[1, 1], [1, 2], [1, 3]])
  await page.getByRole('button', { name: 'Run' }).click()
  await expect(page.getByText('Population: 0', { exact: true })).toHaveText('Population: 0', { timeout: 5000 })
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByText('Population: 0')).toBeVisible()
})

test('[A9] reload keeps the 2x2 block alive', async ({ page }) => {
  await page.goto('/')
  await setGrid(page, [[2, 2], [2, 3], [3, 2], [3, 3]])
  await expect(page.getByText('Population: 4')).toBeVisible()
  await page.reload()
  for (const [row, col] of [[2, 2], [2, 3], [3, 2], [3, 3]] as Array<[number, number]>) {
    await expect(cell(page, row, col)).toHaveAttribute('aria-pressed', 'true')
  }
  await expect(page.getByText('Population: 4')).toBeVisible()
})
