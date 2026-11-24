import { expect, test } from '@playwright/test'

async function addReceipt(
  page: import('@playwright/test').Page,
  values: { merchant: string; amount: string; category: string },
) {
  await page.getByLabel('Merchant').fill(values.merchant)
  await page.getByLabel('Amount').fill(values.amount)
  await page.getByLabel('Category').selectOption({ label: values.category })
  await page.getByRole('button', { name: 'Add receipt' }).click()
}

async function addBoth(page: import('@playwright/test').Page) {
  await addReceipt(page, { merchant: 'Grocery Store', amount: '50.00', category: 'Food' })
  await addReceipt(page, { merchant: 'Office Supplies', amount: '25.50', category: 'Office' })
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Receipt Tracker' })).toBeVisible()
  await expect(page.getByText('No receipts yet')).toBeVisible()
})

test('[A2] add a receipt', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, { merchant: 'Grocery Store', amount: '50.00', category: 'Food' })
  await expect(page.getByText('Grocery Store')).toBeVisible()
  await expect(page.getByText('$50.00')).toBeVisible()
  await expect(page.getByText('Food')).toBeVisible()
  await expect(page.getByText('No receipts yet')).toHaveCount(0)
})

test('[A3] second receipt updates the table and total', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(3)
  await expect(page.getByText('Total: $75.50')).toBeVisible()
})

test('[A4] search filters rows by merchant', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await page.getByLabel('Search').fill('Grocery')
  await expect(page.getByText('Grocery Store')).toBeVisible()
  await expect(page.getByText('Office Supplies')).toHaveCount(0)
})

test('[A5] category filter shows only matching rows', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await page.getByLabel('Category').selectOption({ label: 'Office' })
  await expect(page.getByText('Office Supplies')).toBeVisible()
  await expect(page.getByText('Grocery Store')).toHaveCount(0)
})

test('[A6] delete a receipt updates the table and total', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await page.getByRole('button', { name: 'Delete Grocery Store' }).click()
  await expect(page.getByText('Grocery Store')).toHaveCount(0)
  await expect(page.getByText('Total: $25.50')).toBeVisible()
})

test('[A7] export CSV downloads receipts.csv with header and rows', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('receipts.csv')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const content = Buffer.concat(chunks).toString('utf8')
  expect(content).toContain('Merchant,Category,Amount')
  expect(content).toContain('Grocery Store,Food,50.00')
})

test('[A8] missing amount shows an error and adds no row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Merchant').fill('Empty')
  await page.getByLabel('Category').selectOption({ label: 'Food' })
  await page.getByRole('button', { name: 'Add receipt' }).click()
  await expect(page.getByText('Amount is required')).toBeVisible()
  await expect(page.getByText('No receipts yet')).toBeVisible()
})

test('[A9] reload keeps the receipts', async ({ page }) => {
  await page.goto('/')
  await addBoth(page)
  await page.reload()
  await expect(page.getByText('Office Supplies')).toBeVisible()
  await expect(page.getByText('$25.50')).toBeVisible()
})
