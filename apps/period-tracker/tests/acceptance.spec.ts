import { expect, test, type Page } from '@playwright/test'

async function addPeriod(page: Page, start: string, length: string) {
  await page.getByLabel('Start date').fill(start)
  await page.getByLabel('Length (days)').fill(length)
  await page.getByRole('button', { name: 'Add period' }).click()
}

test('[A1] fresh app shows the heading and the empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Period Tracker' })).toBeVisible()
  await expect(page.getByText('No periods recorded yet')).toBeVisible()
})

test('[A2] adding a period creates a list item and removes the empty state', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  const item = page.getByRole('listitem').filter({ hasText: '2023-10-01' })
  await expect(item).toContainText('5 days')
  await expect(page.getByText('No periods recorded yet')).toHaveCount(0)
})

test('[A3] two periods yield the average cycle and next period in the summary', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await expect(page.getByText('Average cycle: 27 days')).toBeVisible()
  await expect(page.getByText('Next period: 2023-11-24')).toBeVisible()
})

test('[A4] deleting a period removes it and clears the summary', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('button', { name: 'Delete 2023-10-01' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '2023-10-01' })).toHaveCount(0)
  await expect(page.getByText('Average cycle: —')).toBeVisible()
  await expect(page.getByText('Next period: —')).toBeVisible()
})

test('[A5] the Calendar tab shows a month grid with the period starts highlighted', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await expect(page.getByText('Period start')).toHaveCount(2)
  const grid = page.getByRole('grid').first()
  await expect(grid).toBeVisible()
  await expect(grid.getByText('2023-10-01')).toBeVisible()
  await expect(grid.getByText('2023-10-28')).toBeVisible()
})

test('[A6] clicking the predicted date in the Calendar view shows "Predicted period"', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await page.getByText('2023-11-24').click()
  await expect(page.getByText('Predicted period')).toBeVisible()
})

test('[A7] Export ICS copies a VCALENDAR string and confirms the export', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await page.getByRole('button', { name: 'Export ICS' }).click()
  await expect(page.getByText('Calendar exported')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the ICS text').toContain('BEGIN:VCALENDAR')
})

test('[A8] saving settings with a new default length updates the value used for predictions', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await page.reload()
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Default length').fill('7')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await expect(page.getByText('Predicted period')).toBeVisible()
})

test('[A9] a period survives a reload', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: '2023-10-01' })
  await expect(item).toContainText('5 days')
})
