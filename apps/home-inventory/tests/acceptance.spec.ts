import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'

test('[A1] empty state shows heading and "No items yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Home Inventory')).toBeVisible()
  await expect(page.getByText('No items yet')).toBeVisible()
})

test('[A2] add item fills a row with the formatted value', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  const row = page.getByRole('row').filter({ hasText: 'Laptop' })
  await expect(row).toHaveText(/Laptop/)
  await expect(row).toHaveText(/Office/)
  await expect(row).toHaveText(/\$1,200\.00/)
  await expect(page.getByText('No items yet')).toHaveCount(0)
})

test('[A3] sort by value shows descending indicator and puts Laptop first', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByRole('button', { name: 'Sort by Value' }).click()
  const header = page.getByRole('columnheader', { name: /Value/ })
  await expect(header).toHaveText(/↓/)
  const rows = page.getByRole('row')
  await expect(rows.nth(1)).toHaveText(/Laptop/)
})

test('[A4] search filters rows and reports no matches', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Search items').fill('Lap')
  await expect(page.getByRole('row').filter({ hasText: 'Laptop' })).toBeVisible()
  await page.getByLabel('Search items').fill('Table')
  await expect(page.getByText('No items match')).toBeVisible()
})

test('[A5] edit pre-fills the form and save updates the row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByRole('button', { name: 'Edit Laptop' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Laptop')
  await expect(page.getByLabel('Location')).toHaveValue('Office')
  await expect(page.getByLabel('Value')).toHaveValue('1200')
  await page.getByLabel('Value').fill('1500')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Laptop' })).toHaveText(/\$1,500\.00/)
})

test('[A6] delete removes the row and shows the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByRole('button', { name: 'Delete Laptop' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Laptop' })).toHaveCount(0)
  await expect(page.getByText('No items yet')).toBeVisible()
})

test('[A7] export CSV downloads the item with the header row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const content = readFileSync(path!, 'utf8')
  expect(content).toContain('Name,Location,Value')
  expect(content).toContain('Laptop,Office,1200')
})

test('[A8] two items show both rows and the total value', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Name').fill('Chair')
  await page.getByLabel('Location').fill('Living Room')
  await page.getByLabel('Value').fill('300')
  await page.getByRole('button', { name: 'Add item' }).click()
  const rows = page.getByRole('row')
  await expect(rows).toHaveText(/Laptop/)
  await expect(rows).toHaveText(/Chair/)
  await expect(page.getByText('Total value: $1,500.00')).toBeVisible()
})

test('[A9] reload keeps the stored item', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Laptop')
  await page.getByLabel('Location').fill('Office')
  await page.getByLabel('Value').fill('1200')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: 'Laptop' })
  await expect(row).toHaveText(/Laptop/)
  await expect(row).toHaveText(/Office/)
  await expect(row).toHaveText(/\$1,200\.00/)
})
