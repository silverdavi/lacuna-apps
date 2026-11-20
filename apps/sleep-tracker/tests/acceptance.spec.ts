import { expect, test, type Page } from '@playwright/test'

async function logSleep(page: Page, date: string, duration: string, quality: string) {
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Duration').fill(duration)
  await page.getByLabel('Quality').selectOption(quality)
  await page.getByRole('button', { name: 'Log sleep' }).click()
}

test('[A1] no entries shows empty state and zero summary', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sleep Tracker' })).toBeVisible()
  await expect(page.getByText('No sleep entries yet')).toBeVisible()
  await expect(page.getByText('Total nights: 0')).toBeVisible()
  await expect(page.getByText('Average duration: 0h 00m')).toBeVisible()
  await expect(page.getByText('Streak: 0 days')).toBeVisible()
})

test('[A2] logging a night adds a list item and updates the summary', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '7h 30m', 'Good')
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-15' })
  await expect(item).toContainText('7h 30m')
  await expect(item).toContainText('Good')
  await expect(page.getByText('Total nights: 1')).toBeVisible()
  await expect(page.getByText('Average duration: 7h 30m')).toBeVisible()
  await expect(page.getByText('Streak: 1 days')).toBeVisible()
})

test('[A3] logging a second night updates the summary to two nights', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '7h 30m', 'Good')
  await logSleep(page, '2024-01-16', '6h 15m', 'Fair')
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-16' })
  await expect(item).toContainText('6h 15m')
  await expect(item).toContainText('Fair')
  await expect(page.getByText('Total nights: 2')).toBeVisible()
  // The spec states 6h 53m; the exact mean is 6h 52m 30s — test the spec's reading, which agrees with the other checks.
  await expect(page.getByText('Average duration: 6h 53m')).toBeVisible()
  await expect(page.getByText('Streak: 2 days')).toBeVisible()
})

test('[A4] empty duration shows an error and adds nothing', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Date').fill('2024-01-15')
  await page.getByLabel('Duration').fill('')
  await page.getByLabel('Quality').selectOption('Good')
  await page.getByRole('button', { name: 'Log sleep' }).click()
  await expect(page.getByText('Enter a valid duration')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A5] deleting an entry removes it and updates the summary', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '7h 30m', 'Good')
  await logSleep(page, '2024-01-16', '6h 15m', 'Fair')
  await page.getByRole('button', { name: 'Delete 2024-01-15' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '2024-01-15' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: '2024-01-16' })).toBeVisible()
  await expect(page.getByText('Total nights: 1')).toBeVisible()
  await expect(page.getByText('Average duration: 6h 15m')).toBeVisible()
  await expect(page.getByText('Streak: 1 days')).toBeVisible()
})

test('[A6] a bare hour duration is stored as hours and minutes', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '8h', 'Good')
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-15' })
  await expect(item).toContainText('8h 00m')
})

test('[A7] the heatmap shows a cell for the logged night with its duration', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '7h 30m', 'Good')
  const heatmap = page.getByRole('region', { name: 'heatmap' })
  const cell = heatmap.getByText('2024-01-15')
  await expect(cell).toBeVisible()
  // Only the 2024-01-15 entry exists, so the 7h 30m shown in the heatmap is its cell text.
  await expect(heatmap.getByText('7h 30m')).toBeVisible()
})

test('[A8] the trend chart shows a data point for the logged night', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '7h 30m', 'Good')
  const chart = page.getByRole('region', { name: 'trend chart' })
  await expect(chart.getByText('2024-01-15')).toBeVisible()
  // A single 7h 30m entry is exactly 7.5 hours.
  await expect(chart.getByText('7.5')).toBeVisible()
})

test('[A9] entries persist across a reload', async ({ page }) => {
  await page.goto('/')
  await logSleep(page, '2024-01-15', '7h 30m', 'Good')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-15' })
  await expect(item).toContainText('7h 30m')
  await expect(item).toContainText('Good')
  await expect(page.getByText('Total nights: 1')).toBeVisible()
})
