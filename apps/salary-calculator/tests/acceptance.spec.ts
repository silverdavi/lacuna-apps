import { expect, test, type Page } from '@playwright/test'

// The spec does not say how chart segments are marked; a segment is any visible
// element whose text contains the label, and its value is read from its text
// or an aria-valuenow attribute.
async function segmentValue(page: Page, label: string): Promise<string> {
  const seg = page.locator('[role="img"], [role="listitem"], [role="graphics-symbol"], li').filter({ hasText: label }).last()
  await expect(seg).toBeVisible()
  return (
    (await seg.getAttribute('aria-valuenow')) ??
    ((await seg.innerText()).match(/\$[\d,]+\.\d\d/) ?? [''])[0]
  )
}

async function fillAndCalculate(page: Page, inputs: Record<string, string>) {
  for (const [label, value] of Object.entries(inputs)) {
    if (value) await page.getByLabel(label).fill(value)
  }
  await page.getByRole('button', { name: 'Calculate' }).click()
}

test('[A1] no inputs show heading, zero result, and table header row', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Salary Calculator' })).toBeVisible()
  await expect(page.getByText('Net Pay: $0.00')).toBeVisible()
  const header = page.locator('tr', { hasText: 'Deduction' }).first()
  await expect(header).toBeVisible()
  await expect(header.getByText('Deduction')).toBeVisible()
  await expect(header.getByText('Amount')).toBeVisible()
})

test('[A2] gross 50000 yields net 37500 and Federal Tax 12500', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': '50000' })
  await expect(page.getByText('Net Pay: $37,500.00')).toBeVisible()
  const row = page.locator('tr', { hasText: 'Federal Tax' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText('Federal Tax')).toBeVisible()
  await expect(row.getByText('$12,500.00')).toBeVisible()
})

test('[A3] gross 50000 with State Tax 5000 yields net 32500', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': '50000', 'State Tax': '5000' })
  await expect(page.getByText('Net Pay: $32,500.00')).toBeVisible()
  const row = page.locator('tr', { hasText: 'State Tax' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText('$5,000.00')).toBeVisible()
})

test('[A4] gross 100000 with all deductions yields net 65000 and three rows', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, {
    'Gross Annual Salary': '100000',
    'Federal Tax': '20000',
    'State Tax': '10000',
    'Other Deductions': '5000',
  })
  await expect(page.getByText('Net Pay: $65,000.00')).toBeVisible()
  const federal = page.locator('tr', { hasText: 'Federal Tax' }).first()
  await expect(federal).toBeVisible()
  await expect(federal.getByText('$20,000.00')).toBeVisible()
  const state = page.locator('tr', { hasText: 'State Tax' }).first()
  await expect(state).toBeVisible()
  await expect(state.getByText('$10,000.00')).toBeVisible()
  const other = page.locator('tr', { hasText: 'Other Deductions' }).first()
  await expect(other).toBeVisible()
  await expect(other.getByText('$5,000.00')).toBeVisible()
})

test('[A5] gross 0 shows validation message and keeps zero result', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': '0' })
  await expect(page.getByText('Gross salary must be greater than 0')).toBeVisible()
  await expect(page.getByText('Net Pay: $0.00')).toBeVisible()
})

test('[A6] gross 42000 shows chart segments for Net Pay and Federal Tax', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': '42000' })
  const netValue = await segmentValue(page, 'Net Pay')
  await expect(netValue).toContain('$31,500.00')
  const taxValue = await segmentValue(page, 'Federal Tax')
  await expect(taxValue).toContain('$10,500.00')
})

test('[A7] non-numeric gross shows validation message and keeps zero result', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': 'abc' })
  await expect(page.getByText('Enter a valid number')).toBeVisible()
  await expect(page.getByText('Net Pay: $0.00')).toBeVisible()
})

test('[A8] gross 60000 with Federal Tax 15000 yields net 45000', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': '60000', 'Federal Tax': '15000' })
  await expect(page.getByText('Net Pay: $45,000.00')).toBeVisible()
  const row = page.locator('tr', { hasText: 'Federal Tax' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText('$15,000.00')).toBeVisible()
})

test('[A9] last calculation persists across reload', async ({ page }) => {
  await page.goto('/')
  await fillAndCalculate(page, { 'Gross Annual Salary': '50000' })
  await expect(page.getByText('Net Pay: $37,500.00')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Net Pay: $37,500.00')).toBeVisible()
  const row = page.locator('tr', { hasText: 'Federal Tax' }).first()
  await expect(row).toBeVisible()
  await expect(row.getByText('$12,500.00')).toBeVisible()
})
