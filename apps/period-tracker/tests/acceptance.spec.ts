import { expect, test, type Page } from '@playwright/test'

async function addPeriod(page: Page, start: string, length: string) {
  await page.getByLabel('Start date').fill(start)
  await page.getByLabel('Length (days)').fill(length)
  await page.getByRole('button', { name: 'Add period' }).click()
}

test('[A1] no records shows the heading and the empty message', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Period Tracker' })).toBeVisible()
  await expect(page.getByText('No periods recorded yet')).toBeVisible()
})

test('[A2] adding a period creates a list item and removes the empty message', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  const item = page.getByRole('listitem').filter({ hasText: '2023-10-01' })
  await expect(item).toContainText('5 days')
  await expect(page.getByText('No periods recorded yet')).toHaveCount(0)
})

test('[A3] two periods produce the average cycle and next period', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await expect(page.getByText('Average cycle: 27 days')).toBeVisible()
  await expect(page.getByText('Next period: 2023-11-24')).toBeVisible()
})

test('[A4] deleting the first period empties the summary', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('button', { name: 'Delete 2023-10-01' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '2023-10-01' })).toHaveCount(0)
  await expect(page.getByText('Average cycle: —')).toBeVisible()
  await expect(page.getByText('Next period: —')).toBeVisible()
})

test('[A5] the calendar view highlights both period starts', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await expect(page.getByText('2023-10-01').first()).toBeVisible()
  await expect(page.getByText('Period start')).toHaveCount(2)
})

test('[A6] clicking the predicted date shows the predicted label', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await page.getByText('2023-11-24').first().click()
  await expect(page.getByText('Predicted period')).toBeVisible()
})

test('[A7] exporting copies the ICS to the clipboard and reports it', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await addPeriod(page, '2023-10-28', '4')
  await page.getByRole('button', { name: 'Export ICS' }).click()
  await expect(page.getByText('Calendar exported')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text.startsWith('BEGIN:VCALENDAR')).toBe(true)
})

test('[A8] saving a new default length updates the default', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()
  const field = page.getByLabel('Default length')
  await expect(field).toHaveValue('5')
  await field.fill('7')
  await page.getByRole('button', { name: 'Save settings' }).click()
  await expect(field).toHaveValue('7')
})

test('[A9] the added period survives a reload', async ({ page }) => {
  await page.goto('/')
  await addPeriod(page, '2023-10-01', '5')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: '2023-10-01' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('5 days')
})
