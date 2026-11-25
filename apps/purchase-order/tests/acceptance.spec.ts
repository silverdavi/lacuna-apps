// Acceptance tests for the purchase-order app, derived from the spec's checks A1-A9.
// Expected values are copied verbatim from the spec.
import { expect, test, type Page } from '@playwright/test'

// Fill the top-level order form (vendor + date) and save it.
async function saveOrder(page: Page, vendor: string, orderDate: string) {
  await page.getByLabel('Vendor').fill(vendor)
  await page.getByLabel('Order date').fill(orderDate)
  await page.getByRole('button', { name: 'Save' }).click()
}

// Fill one line item in the new order form.
async function fillLineItem(
  page: Page,
  values: Record<string, string>,
) {
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label).fill(value)
  }
}

// The row of the order with the given vendor.
function row(page: Page, vendor: string) {
  return page.locator('tr').filter({ hasText: vendor })
}

test('[A1] heading is "Purchase Order" and the empty list shows "No purchase orders yet"', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Purchase Order' })).toBeVisible()
  await expect(page.getByText('No purchase orders yet')).toBeVisible()
})

test('[A2] "New order" opens the form and Save adds a row with vendor and date', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill('Acme Corp')
  await page.getByLabel('Order date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Save' }).click()
  const r = row(page, 'Acme Corp')
  await expect(r).toBeVisible()
  await expect(r).toContainText('2024-01-15')
})

// A3 shows "$25.00" in the row, which is the unit price column of the contract;
// the "$256.50" total is the line total from the spec's worked example.
test('[A3] a line item of 10 x $25.00 at 5% discount and 8% tax totals $256.50', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill('Acme Corp')
  await page.getByLabel('Order date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await fillLineItem(page, {
    Description: 'Widget',
    Quantity: '10',
    'Unit price': '25.00',
    'Discount %': '5',
    'Tax %': '8',
  })
  await page.getByRole('button', { name: 'Save' }).click()
  const r = row(page, 'Acme Corp')
  await expect(r).toContainText('Widget')
  await expect(r).toContainText('10')
  await expect(r).toContainText('$25.00')
  await expect(r).toContainText('$256.50')
})

test('[A4] "Delete Acme Corp" removes the row and restores the empty text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill('Acme Corp')
  await page.getByLabel('Order date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await fillLineItem(page, {
    Description: 'Widget',
    Quantity: '10',
    'Unit price': '25.00',
    'Discount %': '5',
    'Tax %': '8',
  })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Acme Corp')).toContainText('$256.50')
  await page.getByRole('button', { name: 'Delete Acme Corp' }).click()
  await expect(row(page, 'Acme Corp')).toHaveCount(0)
  await expect(page.getByText('No purchase orders yet')).toBeVisible()
})

test('[A5] "Export CSV" copies the header and data row to the clipboard', async ({ page, context }) => {
  // grant before the export click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill('Acme Corp')
  await page.getByLabel('Order date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await fillLineItem(page, {
    Description: 'Widget',
    Quantity: '10',
    'Unit price': '25.00',
    'Discount %': '5',
    'Tax %': '8',
  })
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Export CSV' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('vendor,order_date,description,quantity,unit_price,discount_pct,tax_pct,total')
  expect(text).toContain('Acme Corp,2024-01-15,Widget,10,25.00,5,8,256.50')
})

test('[A6] a line item of 2 x $100.00 at 0% discount and 10% tax totals $220.00', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill('Beta Inc')
  await page.getByLabel('Order date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await fillLineItem(page, {
    Description: 'Gadget',
    Quantity: '2',
    'Unit price': '100.00',
    'Discount %': '0',
    'Tax %': '10',
  })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Beta Inc')).toContainText('$220.00')
})

test('[A7] the "Total" header is present and sorting by it puts the larger order first', async ({
  page,
}) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15')
  await saveOrder(page, 'Beta Inc', '2024-01-15')
  await expect(page.getByRole('columnheader', { name: 'Total' })).toBeVisible()
  await page.getByRole('columnheader', { name: 'Total' }).click()
  const rows = page.locator('tr').filter({ hasText: /Inc|Corp/ })
  await expect(rows.nth(0)).toContainText('Beta Inc')
  await expect(rows.nth(1)).toContainText('Acme Corp')
})

test('[A8] typing "Acme" in Search filters to Acme Corp and clearing shows all rows', async ({
  page,
}) => {
  await page.goto('/')
  await saveOrder(page, 'Acme Corp', '2024-01-15')
  await saveOrder(page, 'Beta Inc', '2024-01-15')
  await page.getByLabel('Search').fill('Acme')
  await expect(row(page, 'Acme Corp')).toBeVisible()
  await expect(row(page, 'Beta Inc')).toBeHidden()
  await page.getByLabel('Search').fill('')
  await expect(row(page, 'Acme Corp')).toBeVisible()
  await expect(row(page, 'Beta Inc')).toBeVisible()
})

test('[A9] reload keeps the Acme Corp order with total $256.50 visible', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New order' }).click()
  await page.getByLabel('Vendor').fill('Acme Corp')
  await page.getByLabel('Order date').fill('2024-01-15')
  await page.getByRole('button', { name: 'Add line item' }).click()
  await fillLineItem(page, {
    Description: 'Widget',
    Quantity: '10',
    'Unit price': '25.00',
    'Discount %': '5',
    'Tax %': '8',
  })
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Acme Corp')).toContainText('$256.50')
  await page.reload()
  await expect(row(page, 'Acme Corp')).toContainText('$256.50')
})
