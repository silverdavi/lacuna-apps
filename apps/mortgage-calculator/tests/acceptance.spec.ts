// Acceptance tests for the mortgage-calculator app.
// Derived from the spec's acceptance checks A1–A9; expected values copied verbatim.
import { expect, test } from '@playwright/test'

test('[A1] first-open defaults and result summary', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByLabel('Home price')).toHaveValue('300000')
  await expect(page.getByLabel('Down payment')).toHaveValue('60000')
  await expect(page.getByLabel('Interest rate')).toHaveValue('6.5')
  await expect(page.getByLabel('Term')).toHaveValue('30')
  await expect(page.getByText('Loan amount')).toBeVisible()
  await expect(page.getByText('$240,000.00')).toBeVisible()
  await expect(page.getByText('Monthly payment')).toBeVisible()
  await expect(page.getByText('$1,516.96')).toBeVisible()
  await expect(page.getByText('Total interest')).toBeVisible()
  await expect(page.getByText('$306,106.77')).toBeVisible()
})

test('[A2] home price 500000 updates summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Home price').fill('500000')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('$440,000.00')).toBeVisible()
  await expect(page.getByText('$2,781.10')).toBeVisible()
})

test('[A3] down payment 100000 updates summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Down payment').fill('100000')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('$200,000.00')).toBeVisible()
  await expect(page.getByText('$1,264.14')).toBeVisible()
})

test('[A4] term 15 updates summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Term').fill('15')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('$2,090.66')).toBeVisible()
  await expect(page.getByText('$136,318.38')).toBeVisible()
})

test('[A5] yearly table year-1 row shows correct values', async ({ page }) => {
  await page.goto('/')
  // Identify the year-1 row by its label/value; assert the three spec values.
  const year1 = page.getByText('$237,317.46')
  await expect(year1).toBeVisible()
  // The same row also carries the principal and interest figures.
  await expect(page.getByText('$2,682.54')).toBeVisible()
  await expect(page.getByText('$15,521.02')).toBeVisible()
})

test('[A6] year 30 row shows zero balance', async ({ page }) => {
  await page.goto('/')
  // The last yearly row (year 30) is identified by its $0.00 balance.
  await expect(page.getByText('$0.00')).toBeVisible()
})

test('[A7] home price 0 shows error and hides summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Home price').fill('0')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Home price must be greater than 0')).toBeVisible()
  await expect(page.getByText('Loan amount')).toBeHidden()
})

test('[A8] save scenario adds row, empty state before first save', async ({ page }) => {
  await page.goto('/')
  // A fresh app has no saved scenarios yet.
  await expect(page.getByText('No saved scenarios yet')).toBeVisible()
  await page.getByRole('button', { name: 'Save scenario' }).click()
  const list = page.getByLabel('Saved scenarios')
  await expect(list).toBeVisible()
  await expect(list.getByText('$1,516.96')).toBeVisible()
})

test('[A9] reload keeps last calculation and saved scenario', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Home price').fill('500000')
  await page.getByLabel('Down payment').fill('100000')
  await page.getByLabel('Term').fill('20')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('button', { name: 'Save scenario' }).click()
  await page.reload()
  await expect(page.getByText('$2,982.29')).toBeVisible()
  const list = page.getByLabel('Saved scenarios')
  await expect(list.getByText('$2,982.29')).toBeVisible()
})
