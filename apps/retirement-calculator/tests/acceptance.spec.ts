// Acceptance tests for the retirement-calculator app.
// Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
import { expect, test, type Page } from '@playwright/test'

async function calculate(page: Page, rate: string) {
  await page.getByLabel('Current age').fill('30')
  await page.getByLabel('Retirement age').fill('65')
  await page.getByLabel('Current savings').fill('50000')
  await page.getByLabel('Monthly contribution').fill('500')
  await page.getByLabel('Annual return %').fill(rate)
  await page.getByRole('button', { name: 'Calculate' }).click()
}

test('[A1] heading and intro text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Retirement Calculator' })).toBeVisible()
  await expect(page.getByText('Enter your details to estimate your retirement savings.')).toBeVisible()
})

test('[A2] calculate shows the projected savings summary', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '7')
  await expect(page.getByText('Projected savings at retirement: $1,363,250.32')).toBeVisible()
})

test('[A3] breakdown table shows the year-1 row with its balance', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '7')
  const row = page.locator('tr').filter({ has: page.getByRole('cell', { name: 'Year 1', exact: true }) })
  await expect(row).toBeVisible()
  await expect(row.getByRole('cell', { name: '$59,500.00', exact: true })).toBeVisible()
})

test('[A4] the chart tab shows a line chart with one point per year', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '7')
  await page.getByRole('tab', { name: 'Chart' }).click()
  const points = page.locator('[data-point]')
  await expect(points).toHaveCount(35)
  await expect(points.first()).toBeVisible()
})

test('[A5] the Chart and Table tabs toggle between chart and table', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '7')
  await page.getByRole('tab', { name: 'Chart' }).click()
  await expect(page.locator('[data-point]')).toHaveCount(35)
  await page.getByRole('tab', { name: 'Table' }).click()
  const header = page.getByRole('row', { name: /Year/ })
  await expect(header.getByRole('columnheader', { name: 'Year' })).toBeVisible()
  await expect(header.getByRole('columnheader', { name: 'Contribution' })).toBeVisible()
  await expect(header.getByRole('columnheader', { name: 'Growth' })).toBeVisible()
  await expect(header.getByRole('columnheader', { name: 'Balance' })).toBeVisible()
})

test('[A6] changing the return to 10% updates the summary', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '10')
  await expect(page.getByText('Projected savings at retirement: $3,031,267.98')).toBeVisible()
})

test('[A7] Copy result copies the summary to the clipboard', async ({ page, context }) => {
  // the user action that copies must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await calculate(page, '7')
  await page.getByRole('button', { name: 'Copy result' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('Projected savings at retirement: $1,363,250.32')
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('[A8] Save plan adds a numbered plan with its details', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '7')
  await page.getByRole('button', { name: 'Save plan' }).click()
  const plan1 = page.getByRole('listitem').filter({ hasText: 'Plan 1' })
  await expect(plan1).toContainText('Age 30 to 65')
  await expect(plan1).toContainText('Return 7%')
  await page.getByRole('button', { name: 'Save plan' }).click()
  const plan2 = page.getByRole('listitem').filter({ hasText: 'Plan 2' })
  await expect(plan2).toContainText('Age 30 to 65')
  await expect(plan2).toContainText('Return 7%')
})

test('[A9] saved plans survive a reload', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '7')
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.getByRole('button', { name: 'Save plan' }).click()
  await page.reload()
  const plan1 = page.getByRole('listitem').filter({ hasText: 'Plan 1' })
  await expect(plan1).toContainText('Age 30 to 65')
  await expect(plan1).toContainText('Return 7%')
  const plan2 = page.getByRole('listitem').filter({ hasText: 'Plan 2' })
  await expect(plan2).toContainText('Age 30 to 65')
  await expect(plan2).toContainText('Return 7%')
})
