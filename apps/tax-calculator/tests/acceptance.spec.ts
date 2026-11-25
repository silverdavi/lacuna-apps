import { expect, test } from '@playwright/test'

test('[A1] initial state shows heading and zero summary', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Income Tax Calculator' })).toBeVisible()
  await expect(page.getByText('Tax: $0.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 0.00%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $0.00', { exact: true })).toBeVisible()
})

test('[A2] single 50000 calculates tax 4,600.00', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption('Single')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $4,600.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 9.20%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $40,000.00', { exact: true })).toBeVisible()
})

test('[A3] single 100000 calculates tax 15,600.00', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('100000')
  await page.getByLabel('Filing status').selectOption('Single')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $15,600.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 15.60%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $90,000.00', { exact: true })).toBeVisible()
})

test('[A4] married filing jointly 50000 calculates tax 4,400.00', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption('Married filing jointly')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $4,400.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 8.80%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $40,000.00', { exact: true })).toBeVisible()
})

test('[A5] single 200000 calculates tax 41,200.00', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('200000')
  await page.getByLabel('Filing status').selectOption('Single')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $41,200.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 20.60%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $190,000.00', { exact: true })).toBeVisible()
})

test('[A6] breakdown rows for single 50000', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption('Single')
  await page.getByRole('button', { name: 'Calculate' }).click()
  const table = page.getByRole('table')
  await expect(table.getByRole('row').filter({ hasText: '10%' })).toContainText('$10,000.00', { exact: true })
  await expect(table.getByRole('row').filter({ hasText: '10%' })).toContainText('$1,000.00', { exact: true })
  await expect(table.getByRole('row').filter({ hasText: '12%' })).toContainText('$30,000.00', { exact: true })
  await expect(table.getByRole('row').filter({ hasText: '12%' })).toContainText('$3,600.00', { exact: true })
})

test('[A7] copy result copies tax to clipboard', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption('Single')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('button', { name: 'Copy result' }).click()
  const clip = await page.evaluate(async () => navigator.clipboard.readText())
  expect(clip).toBe('Tax: $4,600.00')
})

test('[A8] zero income shows error and keeps zero summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('0')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Enter a gross income greater than 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Tax: $0.00', { exact: true })).toBeVisible()
})

test('[A9] reload keeps last calculation', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption('Single')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $4,600.00', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Tax: $4,600.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 9.20%', { exact: true })).toBeVisible()
})
