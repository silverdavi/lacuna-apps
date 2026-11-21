import { expect, test } from '@playwright/test'

test('[A1] first open shows default inputs and results', async ({ page }) => {
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

test('[A2] 15 years shows payment and total interest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Years').fill('15')
  await expect(page.getByText('$790.79')).toBeVisible()
  await expect(page.getByText('$42,342.85')).toBeVisible()
})

test('[A3] zero rate shows payment and no interest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('50000')
  await page.getByLabel('Annual rate %').fill('0')
  await page.getByLabel('Years').fill('5')
  await expect(page.getByText('$833.33')).toBeVisible()
  await expect(page.getByText('$0.00')).toBeVisible()
})

test('[A4] 25000 at 7.5 for 5 years shows payment and interest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('25000')
  await page.getByLabel('Annual rate %').fill('7.5')
  await page.getByLabel('Years').fill('5')
  await expect(page.getByText('$500.95')).toBeVisible()
  await expect(page.getByText('$5,056.92')).toBeVisible()
})

test('[A5] schedule has 360 rows and first row is correct', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Show schedule' }).click()
  const rows = page.getByRole('row')
  await expect(rows).toHaveCount(361)
  const row1 = page.getByRole('row').filter({ hasText: '536.82' }).first()
  await expect(row1).toContainText('416.67')
  await expect(row1).toContainText('120.15')
  await expect(row1).toContainText('$99,879.85')
})

test('[A6] last schedule row balance is zero', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Show schedule' }).click()
  const last = page.getByRole('row').filter({ hasText: '$0.00' }).last()
  await expect(last).toBeVisible()
})

test('[A7] out-of-range inputs show messages and keep last valid results', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('-100')
  await expect(page.getByText('Principal must be between 1 and 100,000,000')).toBeVisible()
  await expect(page.getByText('$536.82')).toBeVisible()
  await page.getByLabel('Years').fill('80')
  await expect(page.getByText('Years must be between 1 and 50')).toBeVisible()
})

test('[A8] saving a loan adds it to saved loans', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No saved loans yet')).toBeVisible()
  await page.getByRole('button', { name: 'Save loan' }).click()
  const saved = page.getByRole('list', { name: 'Saved loans' }).getByText('$536.82')
  await expect(saved).toBeVisible()
})

test('[A9] reload keeps inputs, results and saved loans', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Principal').fill('25000')
  await page.getByLabel('Annual rate %').fill('7.5')
  await page.getByLabel('Years').fill('5')
  await page.getByRole('button', { name: 'Save loan' }).click()
  await page.reload()
  await expect(page.getByText('$500.95')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Saved loans' }).getByText('$500.95')).toBeVisible()
})
