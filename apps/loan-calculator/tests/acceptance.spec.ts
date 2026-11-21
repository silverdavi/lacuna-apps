// Acceptance tests for the loan-calculator app.
// Derived from the spec's acceptance checks A1-A10; expected values copied verbatim.
// The spec does not name the schedule-table columns; rows are identified by the
// spec's payment numbers and the assertions target the row's own cells.
import { expect, test, type Page } from '@playwright/test'

function paymentRow(page: Page, n: number | string) {
  return page.locator('tr').filter({ hasText: new RegExp(`(^|[\\s,])${n}([\\s,]|$)`) })
}

function scheduleOpen(page: Page) {
  const shown = page.getByText('Hide schedule')
  const hidden = page.getByRole('button', { name: 'Show schedule' })
  return shown
    .isVisible()
    .then(async (visible) => {
      if (!visible) await page.getByRole('button', { name: 'Show schedule' }).click()
    })
}

test('[A1] first-open defaults and results', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Principal')).toHaveValue('100000')
  await expect(page.getByLabel('Annual rate %')).toHaveValue('5')
  await expect(page.getByLabel('Years')).toHaveValue('30')
  await expect(page.getByText('Monthly payment')).toBeVisible()
  await expect(page.getByText('$536.82')).toBeVisible()
  await expect(page.getByText('Total interest')).toBeVisible()
  await expect(page.getByText('$93,255.78')).toBeVisible()
  await expect(page.getByText('Total paid')).toBeVisible()
  await expect(page.getByText('$193,255.78')).toBeVisible()
})

test('[A2] years 15 updates the results', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Years').fill('15')
  await expect(page.getByText('Monthly payment')).toBeVisible()
  await expect(page.getByText('$790.79')).toBeVisible()
  await expect(page.getByText('Total interest')).toBeVisible()
  await expect(page.getByText('$42,342.85')).toBeVisible()
})

test('[A3] zero rate shows the principal-divided-by-n payment and no interest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('50000')
  await page.getByLabel('Annual rate %').fill('0')
  await page.getByLabel('Years').fill('5')
  await expect(page.getByText('Monthly payment')).toBeVisible()
  await expect(page.getByText('$833.33')).toBeVisible()
  await expect(page.getByText('Total interest')).toBeVisible()
  await expect(page.getByText('$0.00')).toBeVisible()
})

test('[A4] principal 25000, rate 7.5, years 5', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('25000')
  await page.getByLabel('Annual rate %').fill('7.5')
  await page.getByLabel('Years').fill('5')
  await expect(page.getByText('Monthly payment')).toBeVisible()
  await expect(page.getByText('$500.95')).toBeVisible()
  await expect(page.getByText('Total interest')).toBeVisible()
  await expect(page.getByText('$5,056.92')).toBeVisible()
})

test('[A5] schedule has 360 rows and row 1 shows the spec values', async ({ page }) => {
  await page.goto('/')
  await scheduleOpen(page)
  const rows = page.locator('tr').filter({ has: page.locator('td') })
  await expect(rows).toHaveCount(360)
  const row1 = paymentRow(page, 1)
  await expect(row1).toBeVisible()
  await expect(row1.getByText('$536.82')).toBeVisible()
  await expect(row1.getByText('$416.67')).toBeVisible()
  await expect(row1.getByText('$120.15')).toBeVisible()
  await expect(row1.getByText('$99,879.85')).toBeVisible()
})

test('[A6] schedule row 360 shows zero balance', async ({ page }) => {
  await page.goto('/')
  await scheduleOpen(page)
  const row360 = paymentRow(page, 360)
  await expect(row360).toBeVisible()
  await expect(row360.getByText('$0.00')).toBeVisible()
})

test('[A7] out-of-range inputs show the messages and keep the last results', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('-100')
  await expect(page.getByText('Principal must be between 1 and 100,000,000')).toBeVisible()
  await expect(page.getByText('$536.82')).toBeVisible()
  await page.getByLabel('Years').fill('80')
  await expect(page.getByText('Years must be between 1 and 50')).toBeVisible()
})

test('[A8] saving a loan lists it, and the empty state precedes the first save', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No saved loans yet')).toBeVisible()
  await page.getByRole('button', { name: 'Save loan' }).click()
  const list = page.getByLabel('Saved loans')
  await expect(list).toBeVisible()
  await expect(list.getByText('$536.82')).toBeVisible()
})

test('[A9] reload restores the inputs without saving a loan', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('25000')
  await page.getByLabel('Annual rate %').fill('7.5')
  await page.getByLabel('Years').fill('5')
  await page.reload()
  await expect(page.getByLabel('Principal')).toHaveValue('25000')
  await expect(page.getByLabel('Annual rate %')).toHaveValue('7.5')
  await expect(page.getByLabel('Years')).toHaveValue('5')
  await expect(page.getByText('Monthly payment')).toBeVisible()
  await expect(page.getByText('$500.95')).toBeVisible()
  await expect(page.getByText('No saved loans yet')).toBeVisible()
})

test('[A10] a saved loan survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Save loan' }).click()
  await page.reload()
  const list = page.getByLabel('Saved loans')
  await expect(list.getByText('$536.82')).toBeVisible()
})
