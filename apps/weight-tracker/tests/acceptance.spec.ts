import { expect, test } from '@playwright/test'

// A2/A3 both use the dates 2024-01-15 and 2024-01-22 with weights 72.5 and 71.8.
// A3's "Change: -0.7 kg" is the delta between those two entries.

async function addEntry(
  page: import('@playwright/test').Page,
  date: string,
  weight: string,
) {
  await page.getByRole('button', { name: 'Add entry' }).click()
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Weight (kg)').fill(weight)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] empty state shows heading, no-entries text and add button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Weight Tracker' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add entry' })).toBeVisible()
})

test('[A2] adding an entry shows the item and removes the no-entries text', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '2024-01-15', '72.5')
  await expect(page.getByText('No entries yet')).toHaveCount(0)
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-15' })
  await expect(item).toContainText('72.5 kg')
})

test('[A3] two entries show the second item and the change summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '2024-01-15', '72.5')
  await addEntry(page, '2024-01-22', '71.8')
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-22' })
  await expect(item).toContainText('71.8 kg')
  await expect(page.getByText('Change: -0.7 kg')).toBeVisible()
})

test('[A4] empty or zero weight is rejected', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add entry' }).click()
  await page.getByLabel('Date').fill('2024-01-15')
  await page.getByLabel('Weight (kg)').fill('')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Enter a weight greater than 0')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)

  await page.getByLabel('Weight (kg)').fill('0')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Enter a weight greater than 0')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A5] delete removes the item and the change summary', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '2024-01-15', '72.5')
  await addEntry(page, '2024-01-22', '71.8')
  await page.getByRole('button', { name: 'Delete 2024-01-15' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: '2024-01-15' })).toHaveCount(0)
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-22' })
  await expect(item).toContainText('71.8 kg')
  await expect(page.getByText('Change: -0.7 kg')).toHaveCount(0)
})

test('[A6] the svg line chart has a path and two circles', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '2024-01-15', '72.5')
  await addEntry(page, '2024-01-22', '71.8')
  await expect(page.locator('svg path')).not.toHaveCount(0)
  await expect(page.locator('svg circle')).toHaveCount(2)
})

test('[A7] summary shows latest and change', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '2024-01-15', '72.5')
  await addEntry(page, '2024-01-22', '71.8')
  await expect(page.getByText('Latest: 71.8 kg')).toBeVisible()
  await expect(page.getByText('Change: -0.7 kg')).toBeVisible()
})

test('[A8] a non-numeric weight is rejected', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add entry' }).click()
  await page.getByLabel('Date').fill('2024-01-15')
  await page.getByLabel('Weight (kg)').fill('abc')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Enter a valid weight')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A9] reload keeps the entry', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, '2024-01-15', '72.5')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: '2024-01-15' })
  await expect(item).toContainText('72.5 kg')
})
