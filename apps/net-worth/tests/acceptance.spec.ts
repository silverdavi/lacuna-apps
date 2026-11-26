// Acceptance tests for the net-worth app, derived from the spec's checks A1-A8.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

async function addEntry(page: Page, name: string, type: string, category: string, value: string) {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Type').selectOption(type)
  await page.getByLabel('Category').selectOption(category)
  await page.getByLabel('Value').fill(value)
  await page.getByRole('button', { name: 'Add entry' }).click()
}

function entry(page: Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name })
}

// A5: the spec does not fix the chart's DOM. A segment is any visible element
// whose text contains the label; its value is read from its text or an
// aria-valuenow attribute.
async function segmentValue(page: Page, label: string): Promise<string> {
  const seg = page
    .locator('[role="img"], [role="listitem"], [role="graphics-symbol"], li')
    .filter({ hasText: label })
    .last()
  await expect(seg).toBeVisible()
  return (
    (await seg.getAttribute('aria-valuenow')) ??
    ((await seg.innerText()).match(/-?\$[\d,]+\.\d\d/) ?? [''])[0]
  )
}

test('[A1] empty app shows the heading, "No entries yet" and zero summary lines', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Net Worth Tracker' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
  await expect(page.getByText('Total Assets: $0.00')).toBeVisible()
  await expect(page.getByText('Total Liabilities: $0.00')).toBeVisible()
  await expect(page.getByText('Net Worth: $0.00')).toBeVisible()
})

test('[A2] adding a House asset adds a list item and updates the asset total', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await expect(page.getByText('No entries yet')).toHaveCount(0)
  await expect(entry(page, 'House')).toContainText('$350,000.00')
  await expect(page.getByText('Total Assets: $350,000.00')).toBeVisible()
  await expect(page.getByText('Net Worth: $350,000.00')).toBeVisible()
})

test('[A3] adding a Car Loan liability after the House shows both items and the net worth', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await expect(entry(page, 'Car Loan')).toContainText('-$15,000.00')
  await expect(page.getByText('Total Liabilities: $15,000.00')).toBeVisible()
  await expect(page.getByText('Net Worth: $335,000.00')).toBeVisible()
})

test('[A4] deleting the House entry removes it and updates the summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.getByRole('button', { name: 'Delete House' }).click()
  await expect(entry(page, 'House')).toHaveCount(0)
  await expect(entry(page, 'Car Loan')).toBeVisible()
  await expect(page.getByText('Total Assets: $0.00')).toBeVisible()
  await expect(page.getByText('Total Liabilities: $15,000.00')).toBeVisible()
  await expect(page.getByText('Net Worth: -$15,000.00')).toBeVisible()
})

test('[A5] the Breakdown tab shows a donut chart with a segment per category', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.getByRole('tab', { name: 'Breakdown' }).click()
  const realEstate = await segmentValue(page, 'Real Estate')
  expect(realEstate).toContain('$350,000.00')
  const vehicle = await segmentValue(page, 'Vehicle')
  expect(vehicle).toContain('$15,000.00')
})

test('[A6] Export CSV copies the CSV to the clipboard with header and data line', async ({
  page,
  context,
}) => {
  // grant before the copy click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text.startsWith('Name,Type,Category,Value')).toBe(true)
  expect(text).toContain('House,Asset,Real Estate,350000')
})

test('[A7] a value of 0 shows the error and adds no list item', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '0')
  await expect(page.getByText('Value must be greater than 0')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A8] House and Car Loan survive a reload with their values and net worth', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'House', 'Asset', 'Real Estate', '350000')
  await addEntry(page, 'Car Loan', 'Liability', 'Vehicle', '15000')
  await page.reload()
  await expect(entry(page, 'House')).toContainText('$350,000.00')
  await expect(page.getByText('Net Worth: $335,000.00')).toBeVisible()
})
