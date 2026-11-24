import { expect, test, type Page } from '@playwright/test'

async function addLineItem(page: Page) {
  await page.getByRole('button', { name: 'New sale' }).click()
  await page.getByLabel('Item').selectOption('Widget')
  await page.getByLabel('Quantity').fill('2')
  await page.getByLabel('Unit price').fill('10.00')
  await page.getByLabel('Discount').fill('5')
  await page.getByLabel('Tax rate').fill('10')
  await page.getByRole('button', { name: 'Add line' }).click()
}

async function addWidgetStock(page: Page, stock: string) {
  await page.getByRole('tab', { name: 'Inventory' }).click()
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Name').fill('Widget')
  await page.getByLabel('Stock').fill(stock)
  await page.getByLabel('Price').fill('10.00')
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] shows Point of Sale heading, Sales and Inventory tabs, Sales table', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Point of Sale' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Sales' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Inventory' })).toBeVisible()
  const salesTab = page.getByRole('tab', { name: 'Sales' })
  expect(await salesTab.getAttribute('aria-selected')).toBe('true')
  for (const column of ['ID', 'Date', 'Items', 'Total', 'Actions']) {
    await expect(page.getByRole('columnheader', { name: column })).toBeVisible()
  }
})

test('[A2] new sale form computes line row, subtotal, and total', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page)
  const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) })
  await expect(row.getByRole('cell', { name: '2' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '$10.00' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '-$5.00' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '$1.90' })).toBeVisible()
  await expect(page.getByText('$13.90')).toBeVisible()
  await expect(page.getByText('$15.80')).toBeVisible()
})

test('[A3] saving a sale adds an S-001 row with a View button', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page)
  await page.getByRole('button', { name: 'Save sale' }).click()
  const row = page.locator('tr', { has: page.getByRole('cell', { name: 'S-001' }) })
  await expect(row.getByRole('cell', { name: '2024-01-15' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '1' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '$15.80' })).toBeVisible()
  await expect(row.getByRole('button', { name: 'View' })).toBeVisible()
  await expect(page.getByText('No sales yet')).toHaveCount(0)
})

test('[A4] add item form saves a Widget row with stock and price', async ({ page }) => {
  await page.goto('/')
  await addWidgetStock(page, '100')
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Stock' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible()
  const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) })
  await expect(row.getByRole('cell', { name: '100' })).toBeVisible()
  await expect(row.getByRole('cell', { name: '$10.00' })).toBeVisible()
})

test('[A5] editing an item prefills the form and saves a new stock value', async ({ page }) => {
  await page.goto('/')
  await addWidgetStock(page, '100')
  const row = page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) })
  await row.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Name')).toHaveValue('Widget')
  await expect(page.getByLabel('Stock')).toHaveValue('100')
  await expect(page.getByLabel('Price')).toHaveValue('10.00')
  await page.getByLabel('Stock').fill('85')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('tr', { has: page.getByRole('cell', { name: 'Widget' }) }))
    .getByRole('cell', { name: '85' })
    .toBeVisible()
})

test('[A6] viewing sale S-001 shows the line item detail panel', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page)
  await page.getByRole('button', { name: 'Save sale' }).click()
  await page.locator('tr', { has: page.getByRole('cell', { name: 'S-001' }) })
    .getByRole('button', { name: 'View' })
    .click()
  for (const text of ['Widget', '$10.00', '-$5.00', '$1.90', '$13.90', '$15.80']) {
    await expect(page.getByText(text)).toBeVisible()
  }
})

test('[A7] search filters inventory rows and clearing restores them', async ({ page }) => {
  await page.goto('/')
  await addWidgetStock(page, '100')
  await page.getByRole('tab', { name: 'Inventory' }).click()
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Name').fill('Gadget')
  await page.getByLabel('Stock').fill('5')
  await page.getByLabel('Price').fill('3.00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('cell', { name: 'Widget' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Gadget' })).toBeVisible()
  await page.getByLabel('Search').fill('Wid')
  await expect(page.getByRole('cell', { name: 'Widget' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Gadget' })).toHaveCount(0)
  await page.getByLabel('Search').fill('')
  await expect(page.getByRole('cell', { name: 'Gadget' })).toBeVisible()
})

test('[A8] export csv downloads sales with header and S-001 row', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page)
  await page.getByRole('button', { name: 'Save sale' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const fs = await import('node:fs')
  const content = fs.readFileSync(path, 'utf8')
  expect(content).toContain('ID,Date,Items,Total')
  expect(content).toContain('S-001,2024-01-15,1,15.80')
})

test('[A9] reload keeps the saved sale', async ({ page }) => {
  await page.goto('/')
  await addLineItem(page)
  await page.getByRole('button', { name: 'Save sale' }).click()
  await expect(page.getByRole('cell', { name: 'S-001' })).toBeVisible()
  await page.reload()
  const row = page.locator('tr', { has: page.getByRole('cell', { name: 'S-001' }) })
  await expect(row.getByRole('cell', { name: '$15.80' })).toBeVisible()
})
