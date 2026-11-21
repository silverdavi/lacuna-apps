// Acceptance tests for the tip-calculator app.
// Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
// A3's "Tip: $15.00" is 15% of the 100 bill (tax excluded); it is consistent with
// A8 ("10%" -> "Tip: $10.00"), A4 ($123.00/4 = $30.75), and A6 ($4.75), so the
// tip is asserted on the tax-exclusive bill.
import { expect, test } from '@playwright/test'

// The spec does not say how slider values are read; aria-valuenow is the standard
// source, with the visible value text as a fallback.
async function sliderValue(page: Page, label: string): Promise<number> {
  const slider = page.getByRole('slider', { name: label })
  await expect(slider).toBeVisible()
  const attr = await slider.getAttribute('aria-valuenow')
  if (attr !== null && attr !== '') return Number(attr)
  const text = (await slider.locator('..').innerText()).match(/\d+(?:\.\d+)?/)
  return Number(text?.[0] ?? NaN)
}

async function setBill(page: Page, bill: string, tax: string, tip: number, people: string) {
  await page.getByLabel('Bill amount').fill(bill)
  await page.getByLabel('Tax amount').fill(tax)
  await page.getByLabel('Tip percentage').fill(String(tip))
  await page.getByLabel('Number of people').fill(people)
}

test('[A1] shows the heading and the Bill and Split tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tip Calculator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Bill' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Split' })).toBeVisible()
})

test('[A2] bill 100 and tax 8 show the subtotal, tax, and total lines', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount').fill('100')
  await page.getByLabel('Tax amount').fill('8')
  await expect(page.getByText('Subtotal: $100.00')).toBeVisible()
  await expect(page.getByText('Tax: $8.00')).toBeVisible()
  await expect(page.getByText('Total: $108.00')).toBeVisible()
})

test('[A3] moving the tip slider to 15 shows tip 15.00 and total 123.00', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount').fill('100')
  await page.getByLabel('Tax amount').fill('8')
  await page.getByLabel('Tip percentage').fill('15')
  await expect(page.getByText('Tip: $15.00')).toBeVisible()
  await expect(page.getByText('Total: $123.00')).toBeVisible()
})

test('[A4] 4 people show the per-person line', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount').fill('100')
  await page.getByLabel('Tax amount').fill('8')
  await page.getByLabel('Tip percentage').fill('15')
  await page.getByLabel('Number of people').fill('4')
  await expect(page.getByText('Per person: $30.75')).toBeVisible()
})

test('[A5] the Split tab shows the transfer table', async ({ page }) => {
  await page.goto('/')
  await setBill(page, '100', '8', 15, '4')
  await page.getByRole('tab', { name: 'Split' }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Person' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Paid' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Owes' })).toBeVisible()
  const row = table.locator('tr').filter({ hasText: '1' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText('1', { exact: true })).toBeVisible()
  await expect(row.getByText('$30.75')).toBeVisible()
  await expect(row.getByText('$0.00')).toBeVisible()
})

test('[A6] uneven payments show a transfer line', async ({ page }) => {
  await page.goto('/')
  await setBill(page, '100', '8', 15, '4')
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Person 1 paid').fill('25')
  await page.getByLabel('Person 2 paid').fill('35')
  await expect(page.getByText('Person 1 pays Person 2 $4.75')).toBeVisible()
})

test('[A7] copy summary copies the total and per-person text', async ({ page }) => {
  await page.goto('/')
  await setBill(page, '100', '8', 15, '4')
  await page.getByRole('button', { name: 'Copy summary' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('Total: $123.00, Per person: $30.75')
})

test('[A8] the 10% preset sets the slider to 10', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Bill amount').fill('100')
  await page.getByLabel('Tax amount').fill('8')
  await page.getByLabel('Number of people').fill('4')
  await page.getByLabel('Tip preset').selectOption('10%')
  expect(await sliderValue(page, 'Tip percentage')).toBe(10)
  await expect(page.getByText('Tip: $10.00')).toBeVisible()
})

test('[A9] reload keeps the bill settings and results', async ({ page }) => {
  await page.goto('/')
  await setBill(page, '100', '8', 15, '4')
  await page.reload()
  await expect(page.getByLabel('Bill amount')).toHaveValue('100')
  await expect(page.getByLabel('Tax amount')).toHaveValue('8')
  expect(await sliderValue(page, 'Tip percentage')).toBe(15)
  await expect(page.getByLabel('Number of people')).toHaveValue('4')
  await expect(page.getByText('Total: $123.00')).toBeVisible()
  await expect(page.getByText('Per person: $30.75')).toBeVisible()
})
