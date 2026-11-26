import { expect, test, type Page } from '@playwright/test'

async function addWarranty(page: Page, product: string, purchaseDate: string, warrantyEnd: string) {
  await page.getByLabel('Product name').fill(product)
  await page.getByLabel('Purchase date').fill(purchaseDate)
  await page.getByLabel('Warranty end').fill(warrantyEnd)
  await page.getByRole('button', { name: 'Save warranty' }).click()
}

function row(page: Page, product: string) {
  return page.getByRole('row', { name: new RegExp(product, 'i') })
}

async function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) => [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows the "Warranty Tracker" heading and "No warranties yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Warranty Tracker' })).toBeVisible()
  await expect(page.getByText('No warranties yet')).toBeVisible()
})

test('[A2] saving a warranty adds a row with the dates and an Active badge', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  const r = row(page, 'Laptop')
  await expect(r).toContainText('Laptop')
  await expect(r).toContainText('2024-01-15')
  await expect(r).toContainText('2027-01-15')
  await expect(r).toContainText('Active')
  await expect(page.getByText('No warranties yet')).toHaveCount(0)
})

test('[A3] a second warranty with a past end date shows an Expired badge', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(3)
  const r = row(page, 'Phone')
  await expect(r).toContainText('Phone')
  await expect(r).toContainText('Expired')
})

test('[A4] clicking the "Product name" header sorts rows alphabetically', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await page.getByRole('columnheader', { name: 'Product name' }).click()
  expect(await orderBefore(page, 'Laptop', 'Phone')).toBe(true)
})

test('[A5] typing "lap" in Search filters the table to the Laptop row only', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await page.getByLabel('Search').fill('lap')
  await expect(row(page, 'Laptop')).toBeVisible()
  await expect(row(page, 'Phone')).toHaveCount(0)
})

test('[A6] Export CSV downloads a file with the header and the Laptop row', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const content = await download.path()
  const fs = await import('node:fs/promises')
  const text = await fs.readFile(content, 'utf8')
  expect(text).toContain('Product name,Purchase date,Warranty end,Status')
  expect(text).toContain('Laptop,2024-01-15,2027-01-15,Active')
})

test('[A7] clicking "Delete Laptop" removes the row and leaves the Phone row', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await page.getByRole('button', { name: 'Delete Laptop' }).click()
  await expect(row(page, 'Laptop')).toHaveCount(0)
  await expect(row(page, 'Phone')).toBeVisible()
  await expect(page.getByText('No warranties yet')).toHaveCount(0)
})

test('[A8] the "Expiring soon" tab lists only warranties ending within 90 days', async ({ page }) => {
  // Phone ends 2024-06-01 (in the past) and Laptop ends 2027-01-15; per the
  // check, Phone appears in "Expiring soon" and Laptop does not.
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await page.getByRole('tab', { name: 'Expiring soon' }).click()
  await expect(row(page, 'Phone')).toBeVisible()
  await expect(row(page, 'Laptop')).toHaveCount(0)
})

test('[A9] reloading the page keeps the warranty record', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await page.reload()
  const r = row(page, 'Laptop')
  await expect(r).toContainText('Laptop')
  await expect(r).toContainText('2024-01-15')
  await expect(r).toContainText('2027-01-15')
})
