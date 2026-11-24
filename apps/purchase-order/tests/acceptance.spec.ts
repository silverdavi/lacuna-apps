import { expect, test, type Page } from '@playwright/test'

async function addLineItem(
  page: Page,
  values: { Description: string; Quantity: string; 'Unit price': string; 'Discount %': string; 'Tax %': string },
) {
  await page.getByRole('button', { name: 'Add line item' }).click()
  await page.getByLabel('Description').fill(values.Description)
  await page.getByLabel('Quantity').fill(values.Quantity)
  await page.getByLabel('Unit price').fill(values['Unit price'])
  await page.getByLabel('Discount %').fill(values['Discount %'])
  await page.getByLabel('Tax %').fill(values['Tax %'])
}

async function saveOrder(
  page: Page,
  vendor: string,
  orderDate: string,
  lineItems: { Description: string; Quantity: string; 'Unit price': string; 'Discount %': string; 'Tax %': string }[],
) {
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill(vendor)
  await page.getByLabel('Order date').fill(orderDate)
  for (const item of lineItems) {
    await addLineItem(page, item)
  }
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Purchase Order' })).toBeVisible()
  await expect(page.getByText('No purchase orders yet')).toBeVisible()
})

test('[A2] creating an order adds a row with vendor and date', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [])
  const row = page.locator('tr').filter({ hasText: 'Acme Corp' })
  await expect(row).toContainText('2024-01-15')
  await expect(page.getByText('No purchase orders yet')).toHaveCount(0)
})

test('[A3] saving an order with a line item shows the line row and total', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Widget', Quantity: '10', 'Unit price': '25.00', 'Discount %': '5', 'Tax %': '8' },
  ])
  const row = page.locator('tr').filter({ hasText: 'Widget' })
  await expect(row).toContainText('Acme Corp')
  await expect(row).toContainText('10')
  await expect(row).toContainText('$25.00')
  await expect(row).toContainText('$261.00')
})

test('[A4] deleting an order removes it and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Widget', Quantity: '10', 'Unit price': '25.00', 'Discount %': '5', 'Tax %': '8' },
  ])
  await expect(page.locator('tr').filter({ hasText: 'Acme Corp' })).toContainText('$261.00')
  await page.getByRole('button', { name: 'Delete Acme Corp' }).click()
  await expect(page.locator('tr').filter({ hasText: 'Acme Corp' })).toHaveCount(0)
  await expect(page.getByText('No purchase orders yet')).toBeVisible()
})

test('[A5] exporting CSV copies the header and data row to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Widget', Quantity: '10', 'Unit price': '25.00', 'Discount %': '5', 'Tax %': '8' },
  ])
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('vendor,order_date,description,quantity,unit_price,discount_pct,tax_pct,total')
  expect(text).toContain('Acme Corp,2024-01-15,Widget,10,25.00,5,8,261.00')
})

test('[A6] line item total reflects discount and tax', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Gadget', Quantity: '2', 'Unit price': '100.00', 'Discount %': '0', 'Tax %': '10' },
  ])
  const row = page.locator('tr').filter({ hasText: 'Gadget' })
  await expect(row).toContainText('$220.00')
})

test('[A7] clicking the Total column header sorts rows descending', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Widget', Quantity: '10', 'Unit price': '25.00', 'Discount %': '5', 'Tax %': '8' },
  ])
  await saveOrder(page, 'Beta Inc', '2024-02-01', [
    { Description: 'Gizmo', Quantity: '5', 'Unit price': '100.00', 'Discount %': '0', 'Tax %': '0' },
  ])
  await expect(page.locator('th').filter({ hasText: 'Total' })).toBeVisible()
  await page.getByRole('columnheader', { name: 'Total' }).click()
  const rows = page.locator('tr')
  await expect(rows.nth(1)).toContainText('Beta Inc')
  await expect(rows.nth(1)).toContainText('$500.00')
  await expect(rows.nth(2)).toContainText('Acme Corp')
  await expect(rows.nth(2)).toContainText('$261.00')
})

test('[A8] the Search field filters rows by text', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Widget', Quantity: '10', 'Unit price': '25.00', 'Discount %': '5', 'Tax %': '8' },
  ])
  await saveOrder(page, 'Beta Inc', '2024-02-01', [
    { Description: 'Gizmo', Quantity: '5', 'Unit price': '100.00', 'Discount %': '0', 'Tax %': '0' },
  ])
  await page.getByLabel('Search').fill('Acme')
  await expect(page.locator('tr').filter({ hasText: 'Acme Corp' })).toBeVisible()
  await expect(page.locator('tr').filter({ hasText: 'Beta Inc' })).toHaveCount(0)
  await page.getByLabel('Search').fill('')
  await expect(page.locator('tr').filter({ hasText: 'Acme Corp' })).toBeVisible()
  await expect(page.locator('tr').filter({ hasText: 'Beta Inc' })).toBeVisible()
})

test('[A9] an order survives a reload', async ({ page }) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15', [
    { Description: 'Widget', Quantity: '10', 'Unit price': '25.00', 'Discount %': '5', 'Tax %': '8' },
  ])
  await page.reload()
  const row = page.locator('tr').filter({ hasText: 'Acme Corp' })
  await expect(row).toContainText('$261.00')
})
