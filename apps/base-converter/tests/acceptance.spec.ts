import { expect, test, type Page } from '@playwright/test'

function convert(page: Page, value: string, from: string, to: string) {
  page.getByLabel('Value').fill(value)
  page.getByLabel('From base').selectOption(from)
  page.getByLabel('To base').selectOption(to)
}

function historyRow(page: Page) {
  return page.getByRole('table', { name: 'History' }).getByRole('row').filter({ hasText: '255' })
}

test('[A1] heading is "Base Converter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Base Converter' })).toBeVisible()
})

test('[A2] 255 Decimal to Hexadecimal shows FF', async ({ page }) => {
  await page.goto('/')
  convert(page, '255', 'Decimal', 'Hexadecimal')
  await expect(page.getByLabel('Result')).toHaveValue('FF')
})

test('[A3] 1010 Binary to Decimal shows 10', async ({ page }) => {
  await page.goto('/')
  convert(page, '1010', 'Binary', 'Decimal')
  await expect(page.getByLabel('Result')).toHaveValue('10')
})

test('[A4] XLII Roman to Decimal shows 42', async ({ page }) => {
  await page.goto('/')
  convert(page, 'XLII', 'Roman', 'Decimal')
  await expect(page.getByLabel('Result')).toHaveValue('42')
})

test('[A5] Copy result shows "Copied" for 2 seconds', async ({ page }) => {
  await page.goto('/')
  convert(page, '255', 'Decimal', 'Hexadecimal')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  await expect(page.getByText('Copied')).toBeHidden({ timeout: 5000 })
})

test('[A6] 999 Decimal to Binary shows 1111100111', async ({ page }) => {
  await page.goto('/')
  convert(page, '999', 'Decimal', 'Binary')
  await expect(page.getByLabel('Result')).toHaveValue('1111100111')
})

test('[A7] Save to history adds a row with the conversion', async ({ page }) => {
  await page.goto('/')
  convert(page, '255', 'Decimal', 'Hexadecimal')
  await page.getByRole('button', { name: 'Save to history' }).click()
  const row = historyRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('255')
  await expect(row).toContainText('Decimal')
  await expect(row).toContainText('FF')
  await expect(row).toContainText('Hexadecimal')
})

test('[A8] Clear history removes all rows and shows "No history yet"', async ({ page }) => {
  await page.goto('/')
  convert(page, '255', 'Decimal', 'Hexadecimal')
  await page.getByRole('button', { name: 'Save to history' }).click()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByRole('row').filter({ hasText: '255' })).toHaveCount(0)
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A9] history survives a reload', async ({ page }) => {
  await page.goto('/')
  convert(page, '255', 'Decimal', 'Hexadecimal')
  await page.getByRole('button', { name: 'Save to history' }).click()
  await page.reload()
  const row = historyRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('255')
  await expect(row).toContainText('Decimal')
  await expect(row).toContainText('FF')
  await expect(row).toContainText('Hexadecimal')
})
