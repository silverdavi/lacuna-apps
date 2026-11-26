import { expect, test, type Page } from '@playwright/test'

async function calculate(page: Page, birth: string, reference?: string) {
  await page.getByLabel('Birth date', { exact: true }).fill(birth)
  if (reference !== undefined)
    await page.getByLabel('Reference date', { exact: true }).fill(reference)
  await page.getByRole('button', { name: 'Calculate' }).click()
}

async function expectAge(page: Page, years: string, months: string, days: string) {
  await expect(page.getByText(`Years: ${years}`)).toBeVisible()
  await expect(page.getByText(`Months: ${months}`)).toBeVisible()
  await expect(page.getByText(`Days: ${days}`)).toBeVisible()
}

test('[A1] initial state shows heading, intro text and zero result', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Age Calculator' })).toBeVisible()
  await expect(page.getByText('Enter a birth date to begin')).toBeVisible()
  await expectAge(page, '0', '0', '0')
})

test('[A2] birth 1990-01-15 with today 2025-01-30 shows 35y 0m 15d', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-01-30T12:00:00'))
  await page.goto('/')
  await calculate(page, '1990-01-15')
  await expectAge(page, '35', '0', '15')
})

test('[A3] birth 1990-01-15 reference 2025-06-15 shows 35y 5m 0d', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '1990-01-15', '2025-06-15')
  await expectAge(page, '35', '5', '0')
})

test('[A4] leap day birth 2000-02-29 reference 2024-03-01 shows 24y 0m 1d', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '2000-02-29', '2024-03-01')
  await expectAge(page, '24', '0', '1')
})

test('[A5] reference before birth shows error and keeps zero result', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '2025-01-01', '2024-12-31')
  await expect(page.getByText('Reference date must be on or after birth date')).toBeVisible()
  await expectAge(page, '0', '0', '0')
})

test('[A6] breakdown table shows total days 12935', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '1990-01-15', '2025-06-15')
  const row = page.getByRole('row', { name: /Total days/ })
  await expect(row).toBeVisible()
  await expect(row.getByText('12935')).toBeVisible()
})

test('[A7] chart shows a Years bar with value 35', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '1990-01-15', '2025-06-15')
  await expect(page.getByText('Years')).toBeVisible()
  await expect(page.getByText('35')).toBeVisible()
})

test('[A8] today 2025-01-30 without reference matches A2', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2025-01-30T12:00:00'))
  await page.goto('/')
  await calculate(page, '1990-01-15')
  await expectAge(page, '35', '0', '15')
})

test('[A9] calculated age persists across reload', async ({ page }) => {
  await page.goto('/')
  await calculate(page, '1990-01-15', '2025-06-15')
  await expectAge(page, '35', '5', '0')
  await page.reload()
  await expectAge(page, '35', '5', '0')
})
