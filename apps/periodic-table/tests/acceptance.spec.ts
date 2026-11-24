import { expect, test } from '@playwright/test'

test('[A1] page shows heading, search field, data grid with Symbol column, and metals checkbox', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Periodic Table' })).toBeVisible()
  await expect(page.getByLabel('Search elements')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Symbol' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Show only metals' })).toBeVisible()
})

test('[A2] searching Hyd and clicking Hydrogen shows H row in the grid', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Hyd')
  await page.getByText('Hydrogen (H)').click()
  await expect(page.getByRole('cell', { name: 'H' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Hydrogen' })).toBeVisible()
})

test('[A3] Down arrow moves focus to the Helium row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Hyd')
  await page.getByText('Hydrogen (H)').click()
  // the spec does not state which control holds focus, so move focus to the grid row by keydown.
  await page.locator('[role="gridrow"]').filter({ has: page.getByRole('cell', { name: 'H' }) }).focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('cell', { name: 'He' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Helium' })).toBeVisible()
})

test('[A4] searching Carbon and clicking it shows C row with Nonmetal category', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Carbon')
  await page.getByText('Carbon (C)').click()
  await expect(page.getByRole('cell', { name: 'C' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Carbon' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Nonmetal' })).toBeVisible()
})

test('[A5] enabling Show only metals removes Carbon and shows the no-match text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Carbon')
  await page.getByText('Carbon (C)').click()
  await page.getByRole('checkbox', { name: 'Show only metals' }).check()
  await expect(page.getByRole('cell', { name: 'C' })).toBeHidden()
  await expect(page.getByText('No elements match the current filter')).toBeVisible()
})

test('[A6] searching Iron and clicking it shows Fe row with Metal category', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('checkbox', { name: 'Show only metals' }).uncheck()
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await expect(page.getByRole('cell', { name: 'Fe' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Iron' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Metal' })).toBeVisible()
})

test('[A7] Copy details puts the exact text on the clipboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await page.getByRole('button', { name: 'Copy details' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Iron (Fe) | Metal | 55.845')
})

test('[A8] searching Zinc and clicking it shows Zn row with Metal category', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Zinc')
  await page.getByText('Zinc (Zn)').click()
  await expect(page.getByRole('cell', { name: 'Zn' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Zinc' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Metal' })).toBeVisible()
})

test('[A9] filter state survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('checkbox', { name: 'Show only metals' }).check()
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Show only metals' })).toBeChecked()
  await expect(page.getByRole('cell', { name: 'Fe' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Iron' })).toBeVisible()
})
