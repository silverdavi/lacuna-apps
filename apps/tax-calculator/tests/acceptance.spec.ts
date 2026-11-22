import { expect, test } from '@playwright/test'

test('[A1] initial heading and zero summary', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Income Tax Calculator' })).toBeVisible()
  await expect(page.getByText('Tax: $0.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 0.00%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $0.00', { exact: true })).toBeVisible()
})

test('[A2] single filer, 50000 gross', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption({ label: 'Single' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $5,500.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 11.00%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $40,000.00', { exact: true })).toBeVisible()
})

test('[A3] single filer, 100000 gross', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('100000')
  await page.getByLabel('Filing status').selectOption({ label: 'Single' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $13,200.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 13.20%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $90,000.00', { exact: true })).toBeVisible()
})

test('[A4] married filing jointly, 50000 gross', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption({ label: 'Married filing jointly' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $4,400.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 8.80%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $40,000.00', { exact: true })).toBeVisible()
})

test('[A5] single filer, 200000 gross', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('200000')
  await page.getByLabel('Filing status').selectOption({ label: 'Single' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Tax: $42,900.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 21.45%', { exact: true })).toBeVisible()
  await expect(page.getByText('Taxable income: $190,000.00', { exact: true })).toBeVisible()
})

test('[A6] bracket breakdown rows after 50000 single', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption({ label: 'Single' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByRole('table').getByText('10%')).toBeVisible()
  await expect(page.getByRole('table').getByText('$4,000.00', { exact: true })).toBeVisible()
  await expect(page.getByRole('table').getByText('12%')).toBeVisible()
  await expect(page.getByRole('table').getByText('$1,500.00', { exact: true })).toBeVisible()
})

test('[A7] copy result puts expected text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption({ label: 'Single' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.getByRole('button', { name: 'Copy result' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Tax: $5,500.00')
})

test('[A8] zero income shows the error and keeps zero summary', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('0')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Enter a gross income greater than 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Tax: $0.00', { exact: true })).toBeVisible()
})

test('[A9] reload keeps the last calculation', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Gross income').fill('50000')
  await page.getByLabel('Filing status').selectOption({ label: 'Single' })
  await page.getByRole('button', { name: 'Calculate' }).click()
  await page.reload()
  await expect(page.getByText('Tax: $5,500.00', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective rate: 11.00%', { exact: true })).toBeVisible()
})
