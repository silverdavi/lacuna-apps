import { expect, test } from '@playwright/test'

test('details table shows selected element columns', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Hydrogen')
  await page.getByText('Hydrogen (H)').click()
  await expect(page.getByRole('columnheader', { name: 'Symbol' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'H', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Hydrogen', exact: true })).toBeVisible()
})

test('metals filter hides non-metal from details', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Carbon')
  await page.getByText('Carbon (C)').click()
  await page.getByRole('checkbox', { name: 'Show only metals' }).click()
  await expect(page.getByRole('cell', { name: 'Carbon', exact: true })).toHaveCount(0)
})

test('selection and filter persist across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Iron')
  await page.getByText('Iron (Fe)').click()
  await page.getByRole('checkbox', { name: 'Show only metals' }).click()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Show only metals' })).toBeChecked()
  await expect(page.getByRole('cell', { name: 'Fe', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Iron', exact: true })).toBeVisible()
})

test('search results list shows matching elements', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Zinc')
  await expect(page.getByText('Zinc (Zn)')).toBeVisible()
  await page.getByText('Zinc (Zn)').click()
  await expect(page.getByRole('cell', { name: 'Zn', exact: true })).toBeVisible()
})

test('empty search shows all elements in results', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Hydrogen (H)')).toBeVisible()
  await expect(page.getByText('Iron (Fe)')).toBeVisible()
})

test('copy details copies the selected element', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Search elements').fill('Zinc')
  await page.getByText('Zinc (Zn)').click()
  await page.getByRole('button', { name: 'Copy details' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Zinc (Zn) | Metal | 65.38')
})
