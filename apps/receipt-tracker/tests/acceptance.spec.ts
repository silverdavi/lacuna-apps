import { expect, test, type Page } from '@playwright/test'

async function addReceipt(
  page: Page,
  merchant: string,
  amount: string,
  category: string,
) {
  await page.getByLabel('Merchant').fill(merchant)
  await page.getByLabel('Amount').fill(amount)
  await page.getByLabel('Category').selectOption(category)
  await page.getByRole('button', { name: 'Add receipt' }).click()
}

test('[A1] shows the heading and the empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Receipt Tracker' })).toBeVisible()
  await expect(page.getByText('No receipts yet')).toBeVisible()
})

test('[A2] adds a receipt and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Grocery Store', '50.00', 'Food')
  await expect(page.getByText('No receipts yet')).toHaveCount(0)
  const row = page.getByRole('table').getByRole('row', { name: /Grocery Store/ })
  await expect(row).toContainText('$50.00')
  await expect(row).toContainText('Food')
})

test('[A3] two receipts show two rows and the total', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Grocery Store', '50.00', 'Food')
  await addReceipt(page, 'Office Supplies', '25.50', 'Office')
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
  await expect(page.getByText('Total: $75.50')).toBeVisible()
})

test('[A4] the search box filters to matching rows', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Grocery Store', '50.00', 'Food')
  await addReceipt(page, 'Office Supplies', '25.50', 'Office')
  await page.getByLabel('Search').fill('Grocery')
  await expect(page.getByRole('table').getByRole('row', { name: /Grocery Store/ })).toBeVisible()
  await expect(page.getByRole('table').getByRole('row', { name: /Office Supplies/ })).toHaveCount(0)
})

test('[A5] the category filter shows only the matching row', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Grocery Store', '50.00', 'Food')
  await addReceipt(page, 'Office Supplies', '25.50', 'Office')
  await page.getByLabel('Category').selectOption('Office')
  await expect(page.getByRole('table').getByRole('row', { name: /Office Supplies/ })).toBeVisible()
  await expect(page.getByRole('table').getByRole('row', { name: /Grocery Store/ })).toHaveCount(0)
})

test('[A6] delete removes the row and updates the total', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Grocery Store', '50.00', 'Food')
  await addReceipt(page, 'Office Supplies', '25.50', 'Office')
  await page.getByRole('button', { name: 'Delete Grocery Store' }).click()
  await expect(page.getByRole('table').getByRole('row', { name: /Grocery Store/ })).toHaveCount(0)
  await expect(page.getByText('Total: $25.50')).toBeVisible()
})

test('[A7] exports a CSV with the merchant, category and amount', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Grocery Store', '50.00', 'Food')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('receipts.csv')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('Merchant,Category,Amount')
  expect(csv).toContain('Grocery Store,Food,50.00')
})

test('[A8] adding without an amount shows an error and adds no row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Merchant').fill('Empty')
  await page.getByRole('button', { name: 'Add receipt' }).click()
  await expect(page.getByText('Amount is required')).toBeVisible()
  await expect(page.getByRole('table').getByRole('row', { name: /Empty/ })).toHaveCount(0)
})

test('[A9] reload keeps the receipt', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'Office Supplies', '25.50', 'Office')
  await page.reload()
  await expect(
    page.getByRole('table').getByRole('row', { name: /Office Supplies/ }),
  ).toContainText('$25.50')
})
