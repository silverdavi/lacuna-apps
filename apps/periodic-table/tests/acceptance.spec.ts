import { expect, test } from '@playwright/test'

test('[A1] heading, search field, Symbol column and filter checkbox', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Periodic Table' })).toBeVisible()
  await expect(page.getByLabel('Search elements')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Symbol' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Show only metals' })).toBeVisible()
})

test('[A2] searching Hyd and clicking Hydrogen fills the grid', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Hyd')
  await page.getByText('Hydrogen (H)').click()
  await expect(page.getByRole('cell', { name: 'H', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Hydrogen', exact: true })).toBeVisible()
})

test('[A3] Down arrow from Hydrogen moves focus to the Helium row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Hyd')
  await page.getByText('Hydrogen (H)').click()
  await page.getByRole('cell', { name: 'Hydrogen', exact: true }).click()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('cell', { name: 'He', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Helium', exact: true })).toBeVisible()
})

test('[A4] searching Carbon and clicking it shows a Nonmetal row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Carbon')
  await page.getByText('Carbon (C)').click()
  await expect(page.getByRole('cell', { name: 'C', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Carbon', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Nonmetal', exact: true })).toBeVisible()
})

test('[A5] metals filter removes Carbon and shows the no-match text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Carbon')
  await page.getByText('Carbon (C)').click()
  await page.getByRole('checkbox', { name: 'Show only metals' }).click()
  await expect(page.getByRole('cell', { name: 'Carbon', exact: true })).toHaveCount(0)
  await expect(page.getByText('No elements match the current filter')).toBeVisible()
})

test('[A6] with filter off, searching Iron and clicking it shows a Metal row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await expect(page.getByRole('cell', { name: 'Fe', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Iron', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Metal', exact: true })).toBeVisible()
})

test('[A7] Copy details copies the exact Iron string', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await page.getByRole('button', { name: 'Copy details' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Iron (Fe) | Metal | 55.845')
})

test('[A8] searching Zinc and clicking it shows a Metal row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Zinc')
  await page.getByText('Zinc (Zn)').click()
  await expect(page.getByRole('cell', { name: 'Zn', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Zinc', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Metal', exact: true })).toBeVisible()
})

test('[A9] filter state and selection survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('checkbox', { name: 'Show only metals' }).click()
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Show only metals' })).toBeChecked()
  await expect(page.getByRole('cell', { name: 'Fe', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Iron', exact: true })).toBeVisible()
})
