import { expect, test, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
}

async function convert(page: Page, number: string) {
  await page.getByLabel('Number').fill(number)
}

test('[A1] page heading is "Roman Numeral Converter"', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Roman Numeral Converter' })).toBeVisible()
})

test('[A2] 4 shows IV', async ({ page }) => {
  await open(page)
  await convert(page, '4')
  await expect(page.getByLabel('Roman numeral')).toHaveValue('IV')
})

test('[A3] 1994 shows MCMXCIV', async ({ page }) => {
  await open(page)
  await convert(page, '1994')
  await expect(page.getByLabel('Roman numeral')).toHaveValue('MCMXCIV')
})

test('[A4] 3999 shows MMMCMXCIX', async ({ page }) => {
  await open(page)
  await convert(page, '3999')
  await expect(page.getByLabel('Roman numeral')).toHaveValue('MMMCMXCIX')
})

test('[A5] 0 shows the range message and leaves the result empty', async ({ page }) => {
  await open(page)
  await convert(page, '0')
  await expect(page.getByText('Enter an integer from 1 to 3999')).toBeVisible()
  await expect(page.getByLabel('Roman numeral')).toHaveValue('')
})

test('[A6] Copy after converting 2024 places MMXXIV on the clipboard', async ({ page, context }) => {
  // the user action that copies must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  await convert(page, '2024')
  await page.getByRole('button', { name: 'Copy' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('MMXXIV')
})

test('[A7] History tab lists the most recent conversion "2024 → MMXXIV"', async ({ page }) => {
  await open(page)
  await convert(page, '2024')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('2024 → MMXXIV')).toBeVisible()
})

test('[A8] Clear history removes all items and shows "No history yet"', async ({ page }) => {
  await open(page)
  await convert(page, '2024')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('2024 → MMXXIV')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('2024 → MMXXIV')).toHaveCount(0)
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A9] reload keeps the history entry "2024 → MMXXIV"', async ({ page }) => {
  await open(page)
  await convert(page, '2024')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('2024 → MMXXIV')).toBeVisible()
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('2024 → MMXXIV')).toBeVisible()
})
