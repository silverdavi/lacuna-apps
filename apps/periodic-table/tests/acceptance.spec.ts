// Acceptance tests for the periodic-table app.
// Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
import { expect, test, type Page } from '@playwright/test'

const search = (page: Page) => page.getByLabel('Search elements')
const metals = (page: Page) => page.getByLabel('Show only metals')
const results = (page: Page) => page.getByRole('listbox', { name: 'Results' })

test('[A1] page shows heading, search field, grid header, and metals checkbox', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Periodic Table' })).toBeVisible()
  await expect(page.getByLabel('Search elements')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Symbol' })).toBeVisible()
  await expect(metals(page)).toBeVisible()
})

test('[A2] searching "Hyd" shows Hydrogen and clicking it selects it in the grid', async ({ page }) => {
  await page.goto('/')
  await search(page).fill('Hyd')
  await expect(results(page)).toBeVisible()
  await expect(page.getByRole('option', { name: 'Hydrogen (H)' })).toBeVisible()
  await page.getByRole('option', { name: 'Hydrogen (H)' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Hydrogen' })
  await expect(page.getByRole('cell', { name: 'H', exact: true })).toBeVisible()
  await expect(row).toContainText('Hydrogen')
})

test('[A3] Down arrow in the grid moves selection to Helium', async ({ page }) => {
  await page.goto('/')
  await search(page).fill('Hyd')
  await page.getByRole('option', { name: 'Hydrogen (H)' }).click()
  await page.keyboard.press('ArrowDown')
  const row = page.getByRole('row').filter({ hasText: 'Helium' })
  await expect(page.getByRole('cell', { name: 'He', exact: true })).toBeVisible()
  await expect(row).toContainText('Helium')
})

test('[A4] clicking Carbon selects it in the grid', async ({ page }) => {
  await page.goto('/')
  await search(page).fill('Carbon')
  await page.getByRole('option', { name: 'Carbon (C)' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Carbon' })
  await expect(page.getByRole('cell', { name: 'C', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Nonmetal', exact: true })).toBeVisible()
  await expect(row).toContainText('Carbon')
})

test('[A5] "Show only metals" removes non-metals from the grid', async ({ page }) => {
  await page.goto('/')
  await search(page).fill('Carbon')
  await page.getByRole('option', { name: 'Carbon (C)' }).click()
  await metals(page).check()
  await expect(page.getByRole('cell', { name: 'C', exact: true })).toHaveCount(0)
  await expect(page.getByRole('cell', { name: 'Fe', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Zn', exact: true })).toBeVisible()
})

test('[A6] clicking Iron selects it in the grid', async ({ page }) => {
  await page.goto('/')
  await metals(page).check()
  await metals(page).uncheck()
  await search(page).fill('Iron')
  await page.getByRole('option', { name: 'Iron (Fe)' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Iron' })
  await expect(page.getByRole('cell', { name: 'Fe', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Metal', exact: true })).toBeVisible()
  await expect(row).toContainText('Iron')
})

test('[A7] "Copy details" copies the selected element details', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await search(page).fill('Iron')
  await page.getByRole('option', { name: 'Iron (Fe)' }).click()
  await page.getByRole('button', { name: 'Copy details' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Iron (Fe) | Metal | 55.845')
})

test('[A8] clicking Zinc selects it in the grid', async ({ page }) => {
  await page.goto('/')
  await search(page).fill('Zinc')
  await page.getByRole('option', { name: 'Zinc (Zn)' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Zinc' })
  await expect(page.getByRole('cell', { name: 'Zn', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Metal', exact: true })).toBeVisible()
  await expect(row).toContainText('Zinc')
})

test('[A9] filter and selection survive a reload', async ({ page }) => {
  await page.goto('/')
  await metals(page).check()
  await search(page).fill('Iron')
  await page.getByRole('option', { name: 'Iron (Fe)' }).click()
  await page.reload()
  await expect(metals(page)).toBeChecked()
  const row = page.getByRole('row').filter({ hasText: 'Iron' })
  await expect(page.getByRole('cell', { name: 'Fe', exact: true })).toBeVisible()
  await expect(row).toContainText('Iron')
})
