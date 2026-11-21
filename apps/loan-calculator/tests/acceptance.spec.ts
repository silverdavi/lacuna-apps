import { expect, test, type Page } from '@playwright/test'

async function fillInputs(page: Page, principal: string, rate: string, years: string) {
  await page.getByLabel('Principal').fill(principal)
  await page.getByLabel('Annual rate %').fill(rate)
  await page.getByLabel('Years').fill(years)
}

// Column order is not fixed by the spec; locate the row's first and last
// data cells by position instead of asserting the column headers.
function dataCells(page: Page, firstValue: string) {
  return page.locator('tr').filter({ has: page.getByRole('cell', { name: firstValue }) }).locator('td')
}

test('[A1] 100k at 5% for 30 years shows a 567.79 monthly payment', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '100000', '5', '30')
  await expect(page.getByLabel('Monthly payment')).toContainText('567.79')
})

test('[A2] 100k at 5% for 30 years shows total interest and total paid', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '100000', '5', '30')
  await expect(page.getByLabel('Total interest')).toContainText('104,403.60')
  await expect(page.getByLabel('Total paid')).toContainText('204,403.60')
})

test('[A3] shortening the term to 15 years updates payment and interest', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '100000', '5', '30')
  await page.getByLabel('Years').fill('15')
  await expect(page.getByLabel('Monthly payment')).toContainText('791.90')
  await expect(page.getByLabel('Total interest')).toContainText('42,943.60')
})

test('[A4] zero rate splits the principal evenly with no interest', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '50000', '0', '5')
  await expect(page.getByLabel('Monthly payment')).toContainText('833.33')
  await expect(page.getByLabel('Total interest')).toContainText('0.00')
})

test('[A5] Show schedule reveals the schedule with the first row intact', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '100000', '5', '30')
  await page.getByRole('button', { name: 'Show schedule' }).click()
  const cells = dataCells(page, '1')
  await expect(cells.nth(1)).toContainText('567.79')
  await expect(cells.nth(2)).toContainText('417.79')
})

test('[A6] the schedule ends with payment 360 and zero balance', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '100000', '5', '30')
  await page.getByRole('button', { name: 'Show schedule' }).click()
  const cells = dataCells(page, '360')
  await expect(cells.last()).toContainText('0.00')
})

test('[A7] non-numeric principal shows an error and no payment', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('abc')
  await page.getByLabel('Principal').press('Tab')
  await expect(page.getByText('Enter a valid number')).toBeVisible()
  await expect(page.getByLabel('Monthly payment')).toHaveValue('')
})

test('[A8] negative principal shows an error and no payment', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('-100')
  await page.getByLabel('Principal').press('Tab')
  await expect(page.getByText('Principal must be positive')).toBeVisible()
  await expect(page.getByLabel('Monthly payment')).toHaveValue('')
})

test('[A9] calculated results survive a reload', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, '100000', '5', '30')
  await page.reload()
  await expect(page.getByLabel('Monthly payment')).toContainText('567.79')
})
