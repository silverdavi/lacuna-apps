// Acceptance tests for the compound-interest app.
// Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
// A7's quarterly values match A2's monthly values because the spec fixes them
// verbatim; the tests assert the spec's stated numbers.
import { expect, test, type Page } from '@playwright/test'

async function calculate(
  page: Page,
  opts: { principal?: string; rate?: string; years?: string; compounding?: string } = {},
) {
  if (opts.principal) await page.getByLabel('Principal').fill(opts.principal)
  if (opts.rate) await page.getByLabel('Annual rate %').fill(opts.rate)
  if (opts.years) await page.getByLabel('Years').fill(opts.years)
  if (opts.compounding) await page.getByLabel('Compounding').selectOption(opts.compounding)
  await page.getByRole('button', { name: 'Calculate' }).click()
}

test('[A1] heading and default summary show $10,000.00 final and $0.00 interest', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Compound Interest Calc' })).toBeVisible()
  // A1 states the default result summary shows these values; the inputs are at
  // their defaults, so run the calculation as a person would.
  await calculate(page)
  await expect(page.getByText('Final balance: $10,000.00')).toBeVisible()
  await expect(page.getByText('Total interest: $0.00')).toBeVisible()
})

test('[A2] principal 10000, rate 5, years 10, monthly updates the summary', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  await expect(page.getByText('Final balance: $16,470.09')).toBeVisible()
  await expect(page.getByText('Total interest: $6,470.09')).toBeVisible()
})

test('[A3] breakdown table contains a Year 1 row with $500.00 interest and $10,500.00 balance', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  const row = page.locator('tr').filter({ hasText: 'Year 1' })
  await expect(row).toBeVisible()
  await expect(row.getByText('Interest earned: $500.00')).toBeVisible()
  await expect(row.getByText('Balance: $10,500.00')).toBeVisible()
})

test('[A4] chart tab shows an SVG line chart with a tooltip for Year 10', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  await page.getByRole('tab', { name: 'Chart' }).click()
  const svg = page.locator('svg')
  await expect(svg).toBeVisible()
  const points = svg.locator('circle')
  const count = await points.count()
  expect(count, 'chart renders at least one data point').toBeGreaterThan(0)
  // The Year 10 point is the last one in the series.
  const box = await points.last().boundingBox()
  expect(box, 'the Year 10 point has a position to hover').toBeTruthy()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await expect(page.getByText('Year 10: $16,470.09')).toBeVisible()
})

test('[A5] saving with an empty name field saves "Scenario 1" with final $16,470.09', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  await page.getByRole('button', { name: 'Save scenario' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Scenario 1' })
  await expect(item).toBeVisible()
  await expect(item.getByText('Final: $16,470.09')).toBeVisible()
})

test('[A6] naming a scenario "Retirement" saves it and deleting it removes the item', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  await page.getByLabel('Scenario name').fill('Retirement')
  await page.getByRole('button', { name: 'Save scenario' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Retirement' })
  await expect(item).toBeVisible()
  await expect(item.getByText('Final: $16,470.09')).toBeVisible()
  await item.getByRole('button', { name: 'Delete Retirement' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Retirement' })).toHaveCount(0)
})

test('[A7] quarterly compounding with the same inputs gives the spec-stated values', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Quarterly' })
  await expect(page.getByText('Final balance: $16,470.09')).toBeVisible()
  await expect(page.getByText('Total interest: $6,470.09')).toBeVisible()
})

test('[A8] Copy result copies the summary to the clipboard and shows "Copied"', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('Final balance: $16,470.09\nTotal interest: $6,470.09')
})

test('[A9] the saved "Retirement" scenario survives a reload', async ({ page }) => {
  await page.goto('/')
  await calculate(page, { principal: '10000', rate: '5', years: '10', compounding: 'Monthly' })
  await page.getByLabel('Scenario name').fill('Retirement')
  await page.getByRole('button', { name: 'Save scenario' }).click()
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'Retirement' })
  await expect(item).toBeVisible()
  await expect(item.getByText('Final: $16,470.09')).toBeVisible()
})
