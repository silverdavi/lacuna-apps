import { expect, test, type Page } from '@playwright/test'

async function addWarranty(page: Page, name: string, purchase: string, end: string) {
  await page.getByLabel('Product name').fill(name)
  await page.getByLabel('Purchase date').fill(purchase)
  await page.getByLabel('Warranty end').fill(end)
  await page.getByRole('button', { name: 'Save warranty' }).click()
}

function row(page: Page, name: string) {
  return page.getByRole('row', { name: new RegExp(name) })
}

function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) =>
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows the heading and "No warranties yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Warranty Tracker' })).toBeVisible()
  await expect(page.getByText('No warranties yet')).toBeVisible()
})

test('[A2] adding a warranty shows its row with the Active status', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  const r = row(page, 'Laptop')
  await expect(r).toContainText('2024-01-15')
  await expect(r).toContainText('2027-01-15')
  await expect(r).toContainText('Active')
  await expect(page.getByText('No warranties yet')).toHaveCount(0)
})

test('[A3] a past warranty end date shows the Expired status', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await expect(row(page, 'Phone')).toContainText('Expired')
  await expect(row(page, 'Laptop')).toContainText('Active')
})

test('[A4] clicking the Product name header sorts rows alphabetically', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await page.getByRole('columnheader', { name: 'Product name' }).click()
  expect(await orderBefore(page, 'Laptop', 'Phone')).toBe(true)
})

test('[A5] typing "lap" in the search box hides the other row', async ({ page }) => {
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
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const csv = readFileSync(path, 'utf8')
  expect(csv, 'CSV has the header row').toContain('Product name,Purchase date,Warranty end,Status')
  expect(csv, 'CSV has the Laptop data row').toContain('Laptop,2024-01-15,2027-01-15,Active')
})

test('[A7] Delete Laptop removes the row and leaves the other', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await page.getByRole('button', { name: 'Delete Laptop' }).click()
  await expect(row(page, 'Laptop')).toHaveCount(0)
  await expect(row(page, 'Phone')).toBeVisible()
  await expect(page.getByText('No warranties yet')).toHaveCount(0)
})

test('[A8] the Expiring soon tab lists only the warranty ending within 90 days', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await addWarranty(page, 'Phone', '2023-06-01', '2024-06-01')
  await page.getByRole('tab', { name: 'Expiring soon' }).click()
  await expect(row(page, 'Phone')).toBeVisible()
  await expect(row(page, 'Laptop')).toHaveCount(0)
})

test('[A9] a warranty record survives a reload', async ({ page }) => {
  await page.goto('/')
  await addWarranty(page, 'Laptop', '2024-01-15', '2027-01-15')
  await page.reload()
  const r = row(page, 'Laptop')
  await expect(r).toContainText('2024-01-15')
  await expect(r).toContainText('2027-01-15')
})
