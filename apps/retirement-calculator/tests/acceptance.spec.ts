// Acceptance tests for the retirement-calculator app.
// Derived from the spec's acceptance checks A1-A11; expected values copied verbatim.
import { expect, test } from '@playwright/test'

async function calculate(
  page: import('@playwright/test').Page,
  inputs: { age?: string; retirement?: string; savings?: string; monthly?: string; rate?: string } = {},
) {
  if (inputs.age !== undefined) await page.getByLabel('Current age').fill(inputs.age)
  if (inputs.retirement !== undefined) await page.getByLabel('Retirement age').fill(inputs.retirement)
  if (inputs.savings !== undefined) await page.getByLabel('Current savings').fill(inputs.savings)
  if (inputs.monthly !== undefined) await page.getByLabel('Monthly contribution').fill(inputs.monthly)
  if (inputs.rate !== undefined) await page.getByLabel('Annual return %').fill(inputs.rate)
  await page.getByRole('button', { name: 'Calculate' }).click()
}

const base = { age: '30', retirement: '65', savings: '50000', monthly: '500', rate: '7' }

test('[A1] page shows heading and description', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Retirement Calculator' })).toBeVisible()
  await expect(page.getByText('Enter your details to estimate your retirement savings.')).toBeVisible()
})

test('[A2] calculate shows projected savings summary', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await expect(page.getByText('Projected savings at retirement: $1,363,250.32')).toBeVisible()
})

test('[A3] breakdown table shows year 1 balance', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await expect(page.getByRole('row', { name: 'Year 1' })).toContainText('$59,500.00')
})

test('[A4] chart shows 35 data points for years 1 through 35', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await page.getByRole('tab', { name: 'Chart', exact: true }).click()
  const points = page.locator('[data-point]')
  await expect(points).toHaveCount(35)
  await expect(points.first()).toBeVisible()
  await expect(page.getByText('Year 1: $59,500.00')).toBeVisible()
})

test('[A5] tabs show the table with its header row', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await page.getByRole('tab', { name: 'Chart', exact: true }).click()
  await expect(page.locator('[data-point]')).toBeVisible()
  await page.getByRole('tab', { name: 'Table', exact: true }).click()
  await expect(page.getByRole('row', { name: 'Year Contribution Growth Balance' })).toBeVisible()
  await expect(page.locator('[data-point]')).toHaveCount(0)
})

test('[A6] annual return 10 updates the summary', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await page.getByLabel('Annual return %').fill('10')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByText('Projected savings at retirement: $3,031,268.18')).toBeVisible()
})

test('[A7] copy result copies the summary and shows the message', async ({ page, context }) => {
  // grant the clipboard permission before the user action that copies
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await calculate(page, base)
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('Projected savings at retirement: $1,363,250.32')
})

test('[A8] saving plans adds a list item per plan', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  const plan1 = page.getByRole('listitem').filter({ hasText: 'Plan 1' })
  await expect(plan1).toContainText('Age 30 to 65')
  await expect(plan1.getByText('Return 7%', { exact: true })).toBeVisible()
  const plan2 = page.getByRole('listitem').filter({ hasText: 'Plan 2' })
  await expect(plan2).toContainText('Age 30 to 65')
  await expect(plan2.getByText('Return 7%', { exact: true })).toBeVisible()
})

test('[A9] saved plans survive a reload', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.reload()
  const plan1 = page.getByRole('listitem').filter({ hasText: 'Plan 1' })
  await expect(plan1).toContainText('Age 30 to 65')
  await expect(plan1.getByText('Return 7%', { exact: true })).toBeVisible()
  const plan2 = page.getByRole('listitem').filter({ hasText: 'Plan 2' })
  await expect(plan2).toContainText('Age 30 to 65')
  await expect(plan2.getByText('Return 7%', { exact: true })).toBeVisible()
})

// A10: rule values copied from the spec; the A10/A6 value $3,031,268.18 agrees with the
// signature of A10, A2 and A6 (the test-notes figure $3,031,267.98 differs from that).
test('[A10] rule: year 1 and year 35 balances at 7% and 10%', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await expect(page.getByRole('row', { name: 'Year 1' })).toContainText('$59,500.00')
  await expect(page.getByText('$1,363,250.32', { exact: true })).toBeVisible()
  await page.getByLabel('Annual return %').fill('10')
  await page.getByRole('button', { name: 'Calculate' }).click()
  await expect(page.getByRole('row', { name: 'Year 1' })).toContainText('$61,000.00')
  await expect(page.getByText('$3,031,268.18', { exact: true })).toBeVisible()
})

test('[A11] table columns are Year, Contribution, Growth, Balance', async ({ page }) => {
  await page.goto('/')
  await calculate(page, base)
  await expect(page.getByRole('columnheader', { name: 'Year', exact: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Contribution', exact: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Growth', exact: true })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Balance', exact: true })).toBeVisible()
  await expect(page.getByRole('row', { name: 'Year 1' })).toContainText('$6,000.00')
  await expect(page.getByRole('row', { name: 'Year 1' })).toContainText('$3,500.00')
})
