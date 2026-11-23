import { expect, test, type Page } from '@playwright/test'

async function addEntry(
  page: Page,
  name: string,
  type: 'Asset' | 'Liability',
  category: string,
  value: string,
) {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Type').selectOption(type)
  await page.getByLabel('Category').selectOption(category)
  await page.getByLabel('Value').fill(value)
  await page.getByRole('button', { name: 'Add entry' }).click()
}

function entry(page: Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name })
}

test('[A1] empty app shows heading, no-entries text and zero summaries', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Net Worth Tracker' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
  await expect(page.getByText('Total Assets: $0.00')).toBeVisible()
  await expect(page.getByText('Total Liabilities: $0.00')).toBeVisible()
  await expect(page.getByText('Net Worth: $0.00')).toBeVisible()
})

test('[A2] adding an asset entry shows it in the list and updates the summaries', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await expect(page.getByText('No entries yet')).toHaveCount(0)
  await expect(entry(page, 'House')).toContainText('$350,000.00')
  await expect(page.getByText('Total Assets: $350,000.00')).toBeVisible()
  await expect(page.getByText('Net Worth: $350,000.00')).toBeVisible()
})

test('[A3] adding a liability entry sums the liabilities and net worth', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await expect(entry(page, 'Car Loan')).toContainText('-$15,000.00')
  await expect(page.getByText('Total Liabilities: $15,000.00')).toBeVisible()
  await expect(page.getByText('Net Worth: $335,000.00')).toBeVisible()
})

test('[A4] deleting the House entry updates the list and the summaries', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.getByRole('button', { name: 'Delete House' }).click()
  await expect(entry(page, 'House')).toHaveCount(0)
  await expect(page.getByText('Total Assets: $0.00')).toBeVisible()
  await expect(page.getByText('Total Liabilities: $15,000.00')).toBeVisible()
  await expect(page.getByText('Net Worth: -$15,000.00')).toBeVisible()
})

test('[A5] the Breakdown tab shows a donut chart with a segment per category', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.getByRole('tab', { name: 'Breakdown' }).click()
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  await expect(page.getByText('Real Estate')).toBeVisible()
  await expect(page.getByText('Vehicle')).toBeVisible()
  await expect(page.getByText('$350,000.00')).toBeVisible()
  await expect(page.getByText('$15,000.00')).toBeVisible()
})

test('[A6] Export CSV copies the entries as a CSV to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'CSV starts with the header row').toContain('Name,Type,Category,Value')
  expect(text, 'CSV contains the House entry').toContain('House,Asset,Real Estate,350000')
})

test('[A7] a zero value is rejected with a message and adds no entry', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('House')
  await page.getByLabel('Type').selectOption('Asset')
  await page.getByLabel('Category').selectOption('Real Estate')
  await page.getByLabel('Value').fill('0')
  await page.getByRole('button', { name: 'Add entry' }).click()
  await expect(page.getByText('Value must be greater than 0')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A8] entries survive a reload', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.reload()
  await expect(entry(page, 'House')).toContainText('$350,000.00')
  await expect(page.getByText('Net Worth: $335,000.00')).toBeVisible()
})
