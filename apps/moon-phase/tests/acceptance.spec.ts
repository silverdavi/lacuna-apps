import { expect, test } from '@playwright/test'

async function setDateTime(page: import('@playwright/test').Page, date: string, time = '12:00') {
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Time').fill(time)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] the Today panel shows a phase name, illumination, age and the accuracy note', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Moon phase', level: 1 })).toBeVisible()
  await expect(page.getByText('Illuminated', { exact: true })).toBeVisible()
  await expect(page.getByText('Age (days)')).toBeVisible()
  await expect(page.getByText(/Computed on this device from a short lunar series/)).toBeVisible()
})

test('[A2] 2024-04-08 noon is a New Moon under 2 percent lit', async ({ page }) => {
  await setDateTime(page, '2024-04-08')
  await expect(page.locator('.mp-name')).toHaveText('New Moon')
  const pct = await page.locator('.lc-kpi, [class*=kpi]').first().innerText()
  expect(parseFloat(pct)).toBeLessThan(2)
})

test('[A3] the full moon of April 2024 appears in the upcoming list', async ({ page }) => {
  await setDateTime(page, '2024-04-15')
  await page.getByRole('tab', { name: 'Upcoming' }).click()
  await expect(page.getByText('Full Moon').first()).toBeVisible()
  await expect(page.getByText(/Apr 23, 2024/).first()).toBeVisible()
})

test('[A4] +1 day and -1 day move the date; arrow keys do too', async ({ page }) => {
  await setDateTime(page, '2024-04-08')
  await page.getByRole('button', { name: '+1 day' }).click()
  await expect(page.getByLabel('Date')).toHaveValue('2024-04-09')
  await page.getByRole('button', { name: '-1 day' }).click()
  await page.getByRole('button', { name: '-1 day' }).click()
  await expect(page.getByLabel('Date')).toHaveValue('2024-04-07')
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  await page.keyboard.press('ArrowRight')
  await expect(page.getByLabel('Date')).toHaveValue('2024-04-08')
})

test('[A5] the month view lists every day and tapping a day selects it', async ({ page }) => {
  await setDateTime(page, '2024-04-08')
  await page.getByRole('tab', { name: 'Month' }).click()
  await expect(page.getByRole('gridcell')).not.toHaveCount(0)
  await page.getByRole('gridcell', { name: /Apr 23, 2024/ }).click()
  await expect(page.getByLabel('Date')).toHaveValue('2024-04-23')
})

test('[A6] an invalid time shows an inline error and a far year shows the accuracy warning', async ({ page }) => {
  await page.getByLabel('Date').fill('2150-01-01')
  await expect(page.getByText(/outside 1900 to 2100/)).toBeVisible()
  await page.getByLabel('Time').fill('')
  await expect(page.getByText('Enter a valid time')).toBeVisible()
})

test('[A7] the hemisphere and 12 or 24 hour settings persist across reload', async ({ page }) => {
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Southern' }).click()
  await page.getByRole('button', { name: '12-hour' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'Settings' }).click()
  await expect(page.getByRole('button', { name: 'Southern' })).toHaveClass(/active/)
  await expect(page.getByRole('button', { name: '12-hour' })).toHaveClass(/active/)
})
