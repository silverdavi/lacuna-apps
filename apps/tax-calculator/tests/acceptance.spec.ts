import { expect, test } from '@playwright/test'

const tax = (page: any) => page.getByText(/Tax: \$/, { exact: true })
const rate = (page: any) => page.getByText(/Effective rate: /, { exact: true })
const taxable = (page: any) => page.getByText(/Taxable income: /, { exact: true })

async function calc(page: any, income: string, status?: string) {
  await page.getByLabel('Gross income', { exact: true }).fill(income)
  if (status) await page.getByLabel('Filing status', { exact: true }).selectOption({ label: status })
  await page.getByRole('button', { name: 'Calculate', exact: true }).click()
}

test('[A1] initial page shows heading and zero summary', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Income Tax Calculator', exact: true })).toBeVisible()
  await expect(tax(page)).toHaveText('Tax: $0.00')
  await expect(rate(page)).toHaveText('Effective rate: 0.00%')
  await expect(taxable(page)).toHaveText('Taxable income: $0.00')
})

test('[A2] 50000 Single shows tax, rate and taxable income', async ({ page }) => {
  await page.goto('/')
  await calc(page, '50000', 'Single')
  await expect(tax(page)).toHaveText('Tax: $4,600.00')
  await expect(rate(page)).toHaveText('Effective rate: 9.20%')
  await expect(taxable(page)).toHaveText('Taxable income: $40,000.00')
})

test('[A3] 100000 Single shows tax, rate and taxable income', async ({ page }) => {
  await page.goto('/')
  await calc(page, '100000', 'Single')
  await expect(tax(page)).toHaveText('Tax: $15,600.00')
  await expect(rate(page)).toHaveText('Effective rate: 15.60%')
  await expect(taxable(page)).toHaveText('Taxable income: $90,000.00')
})

test('[A4] 50000 MFJ shows tax, rate and taxable income', async ({ page }) => {
  await page.goto('/')
  await calc(page, '50000', 'Married filing jointly')
  await expect(tax(page)).toHaveText('Tax: $4,400.00')
  await expect(rate(page)).toHaveText('Effective rate: 8.80%')
  await expect(taxable(page)).toHaveText('Taxable income: $40,000.00')
})

test('[A5] 200000 Single shows tax, rate and taxable income', async ({ page }) => {
  await page.goto('/')
  await calc(page, '200000', 'Single')
  await expect(tax(page)).toHaveText('Tax: $39,600.00')
  await expect(rate(page)).toHaveText('Effective rate: 19.80%')
  await expect(taxable(page)).toHaveText('Taxable income: $190,000.00')
})

test('[A6] 50000 Single breakdown lists reached brackets', async ({ page }) => {
  await page.goto('/')
  await calc(page, '50000', 'Single')
  const table = page.getByRole('table')
  const row10 = table.locator('tr', { has: page.getByText('10%', { exact: true }) })
  await expect(row10.getByText('$10,000.00', { exact: true })).toBeVisible()
  await expect(row10.getByText('$1,000.00', { exact: true })).toBeVisible()
  const row12 = table.locator('tr', { has: page.getByText('12%', { exact: true }) })
  await expect(row12.getByText('$30,000.00', { exact: true })).toBeVisible()
  await expect(row12.getByText('$3,600.00', { exact: true })).toBeVisible()
})

test('[A7] Copy result copies the tax summary text', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await calc(page, '50000', 'Single')
  await page.getByRole('button', { name: 'Copy result', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Tax: $4,600.00')
})

test('[A8] zero income shows validation and keeps zero summary', async ({ page }) => {
  await page.goto('/')
  await calc(page, '0')
  await expect(page.getByText('Enter a gross income greater than 0', { exact: true })).toBeVisible()
  await expect(tax(page)).toHaveText('Tax: $0.00')
})

test('[A9] calculation survives reload', async ({ page }) => {
  await page.goto('/')
  await calc(page, '50000', 'Single')
  await page.reload()
  await expect(tax(page)).toHaveText('Tax: $4,600.00')
  await expect(rate(page)).toHaveText('Effective rate: 9.20%')
})

test('[A10] taxable income floors at zero and rate divides gross', async ({ page }) => {
  await page.goto('/')
  await calc(page, '5000', 'Single')
  await expect(taxable(page)).toHaveText('Taxable income: $0.00')
  await expect(tax(page)).toHaveText('Tax: $0.00')
  await expect(rate(page)).toHaveText('Effective rate: 0.00%')
})

test('[A11] single brackets: 24% up to 190000, 32% above 210000 gross', async ({ page }) => {
  await page.goto('/')
  await calc(page, '300000', 'Single')
  // A12 agrees with A11: gross 300000 -> taxable 290000 -> 1000 + 3600 + 11000 + 38400 + 12800 = 66800, 22.27%
  await expect(tax(page)).toHaveText('Tax: $66,800.00')
  await expect(rate(page)).toHaveText('Effective rate: 22.27%')
})

test('[A12] 100000 Single spans three brackets', async ({ page }) => {
  await page.goto('/')
  await calc(page, '100000', 'Single')
  await expect(tax(page)).toHaveText('Tax: $15,600.00')
  await expect(rate(page)).toHaveText('Effective rate: 15.60%')
  const row22 = page.getByRole('table').locator('tr', { has: page.getByText('22%', { exact: true }) })
  await expect(row22.getByText('$50,000.00', { exact: true })).toBeVisible()
  await expect(row22.getByText('$11,000.00', { exact: true })).toBeVisible()
})

test('[A13] filing status is a native select and copy works after interaction', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await calc(page, '50000', 'Single')
  const select = page.getByLabel('Filing status', { exact: true })
  await expect(select).toHaveJSProperty('tagName', 'SELECT')
  await expect(select).toHaveValue('single')
  await page.getByRole('button', { name: 'Copy result', exact: true }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Tax: $4,600.00')
})
