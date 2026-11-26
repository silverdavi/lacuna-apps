import { expect, test, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
}

async function convert(page: Page, number: string) {
  await page.getByLabel('Number').fill(number)
}

test('[A1] page heading is "Number to Words"', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Number to Words' })).toBeVisible()
})

test('[A2] 42 shows forty-two', async ({ page }) => {
  await open(page)
  await convert(page, '42')
  await expect(page.getByText('forty-two')).toBeVisible()
})

test('[A3] 1000 shows one thousand', async ({ page }) => {
  await open(page)
  await convert(page, '1000')
  await expect(page.getByText('one thousand')).toBeVisible()
})

test('[A4] 1234567 shows one million two hundred thirty-four thousand five hundred sixty-seven', async ({ page }) => {
  await open(page)
  await convert(page, '1234567')
  await expect(
    page.getByText('one million two hundred thirty-four thousand five hundred sixty-seven'),
  ).toBeVisible()
})

test('[A5] 0 shows zero', async ({ page }) => {
  await open(page)
  await convert(page, '0')
  await expect(page.getByText('zero')).toBeVisible()
})

test('[A6] 99 with Case UPPER shows NINETY-NINE', async ({ page }) => {
  await open(page)
  await convert(page, '99')
  await page.getByLabel('Case').selectOption({ label: 'UPPER' })
  await expect(page.getByText('NINETY-NINE')).toBeVisible()
})

test('[A7] Copy after converting 500 shows the toast and keeps five hundred', async ({ page }) => {
  await open(page)
  await convert(page, '500')
  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  await expect(page.getByText('five hundred')).toBeVisible()
})

test('[A8] Save to history after converting 77 adds a row with 77 and seventy-seven', async ({ page }) => {
  await open(page)
  await convert(page, '77')
  await page.getByRole('button', { name: 'Save to history' }).click()
  await expect(page.getByRole('row').filter({ hasText: '77' })).toContainText('seventy-seven')
})

test('[A9] reload keeps the history row with 77 and seventy-seven', async ({ page }) => {
  await open(page)
  await convert(page, '77')
  await page.getByRole('button', { name: 'Save to history' }).click()
  await expect(page.getByRole('row').filter({ hasText: '77' })).toContainText('seventy-seven')
  await page.reload()
  await expect(page.getByRole('row').filter({ hasText: '77' })).toContainText('seventy-seven')
})
