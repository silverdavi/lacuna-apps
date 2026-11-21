import { expect, test, type Page } from '@playwright/test'

async function logIntake(page: Page, amount: string) {
  await page.getByLabel('Amount (ml)').fill(amount)
  await page.getByRole('button', { name: 'Log intake' }).click()
}

test('[A1] page heading and default goal display', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Water Intake Tracker' })).toBeVisible()
  await expect(page.getByText('Goal: 2000 ml')).toBeVisible()
})

test('[A2] logging 500 adds a list item and updates the progress ring', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '500')
  await expect(page.getByText('500 ml')).toBeVisible()
  await expect(page.getByText('500 / 2000 ml')).toBeVisible()
})

test('[A3] logging 500 then 750 sums to 1250 with two list items', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '500')
  await logIntake(page, '750')
  await expect(page.getByText('1250 / 2000 ml')).toBeVisible()
  const items = page.locator('li')
  await expect(items).toHaveText(['500 ml', '750 ml'])
})

test('[A4] Delete 500 ml removes that entry and updates the progress ring', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '500')
  await logIntake(page, '750')
  await page.getByRole('button', { name: 'Delete 500 ml' }).click()
  const items = page.locator('li')
  await expect(items).toHaveText(['750 ml'])
  await expect(page.getByText('750 / 2000 ml')).toBeVisible()
})

test('[A5] changing the daily goal to 2500 and saving updates the display', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Daily goal (ml)').fill('2500')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await expect(page.getByText('Goal: 2500 ml')).toBeVisible()
  await expect(page.getByText(/2500 ml/)).toBeVisible()
})

test('[A6] the Heatmap tab shows today total in the heatmap', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '500')
  await logIntake(page, '750')
  await page.getByRole('tab', { name: 'Heatmap' }).click()
  await expect(page.getByText('1250')).toBeVisible()
})

test('[A7] the Trend tab shows a data point for today equal to the daily total', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '500')
  await logIntake(page, '750')
  await page.getByRole('tab', { name: 'Trend' }).click()
  // A7 does not name the chart; the trend view must expose today total "1250"
  await expect(page.getByText('1250')).toBeVisible()
})

test('[A8] meeting the daily goal increments the streak to 1 day', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '2000')
  await expect(page.getByText('Streak: 1 day')).toBeVisible()
})

test('[A9] reload keeps logged entries and the custom goal', async ({ page }) => {
  await page.goto('/')
  await logIntake(page, '500')
  await page.getByLabel('Daily goal (ml)').fill('2500')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.reload()
  await expect(page.getByText('500 ml')).toBeVisible()
  await expect(page.getByText('Goal: 2500 ml')).toBeVisible()
  await expect(page.getByText('500 / 2500 ml')).toBeVisible()
})
