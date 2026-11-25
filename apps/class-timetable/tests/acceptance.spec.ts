import { expect, test, type Page } from '@playwright/test'

async function addClass(
  page: Page,
  name: string,
  day: string,
  start: string,
  end: string,
) {
  await page.getByLabel('Class name', { exact: true }).fill(name)
  await page.getByLabel('Day', { exact: true }).selectOption(day)
  await page.getByLabel('Start time', { exact: true }).fill(start)
  await page.getByLabel('End time', { exact: true }).fill(end)
  await page.getByRole('button', { name: 'Add class' }).click()
}

test('[A1] empty app shows the heading and an empty week grid', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Class Timetable' })).toBeVisible()
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
    const column = page.getByRole('region', { name: day })
    await expect(column).toBeVisible()
    await expect(column.getByRole('button')).toHaveCount(0)
  }
})

test('[A2] adding Math on Monday shows a block with name and time range', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  const block = page.getByRole('region', { name: 'Monday' }).getByRole('button', { name: 'Math 09:00–10:00' })
  await expect(block).toBeVisible()
})

test('[A3] the Table tab lists the class and sorts by Class name', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await page.getByRole('tab', { name: 'Table' }).click()
  await expect(page.getByText('Math')).toBeVisible()
  await expect(page.getByText('Monday')).toBeVisible()
  await expect(page.getByText('09:00')).toBeVisible()
  await expect(page.getByText('10:00')).toBeVisible()
  await page.getByRole('columnheader', { name: 'Class name' }).click()
  await expect(page.locator('tr').first()).toContainText('Math')
})

test('[A4] adding Physics on Monday shows two blocks ordered by start time', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  const monday = page.getByRole('region', { name: 'Monday' })
  await expect(monday.getByRole('button', { name: 'Math 09:00–10:00' })).toBeVisible()
  await expect(monday.getByRole('button', { name: 'Physics 08:00–09:00' })).toBeVisible()
  await expect(monday.getByRole('button')).toHaveCount(2)
})

test('[A5] clicking a block opens Class details and Delete removes it', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  const monday = page.getByRole('region', { name: 'Monday' })
  await monday.getByRole('button', { name: 'Math 09:00–10:00' }).click()
  const details = page.getByRole('dialog', { name: 'Class details' })
  await expect(details).toBeVisible()
  await details.getByRole('button', { name: 'Delete class' }).click()
  await expect(monday.getByRole('button', { name: 'Math 09:00–10:00' })).toHaveCount(0)
  await expect(monday.getByRole('button', { name: 'Physics 08:00–09:00' })).toBeVisible()
  await expect(monday.getByRole('button')).toHaveCount(1)
})

test('[A6] adding Chemistry on Tuesday shows a block in the Tuesday column', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Chemistry', 'Tuesday', '11:00', '12:00')
  const block = page.getByRole('region', { name: 'Tuesday' }).getByRole('button', { name: 'Chemistry 11:00–12:00' })
  await expect(block).toBeVisible()
})

test('[A7] Export ICS copies an ICS string containing both summaries', async ({ page, context }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await addClass(page, 'Chemistry', 'Tuesday', '11:00', '12:00')
  // grant before the export click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('SUMMARY:Math')
  expect(text).toContain('SUMMARY:Chemistry')
})

test('[A8] an end time before the start time is rejected with an alert', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Bio', 'Monday', '10:00', '09:00')
  await expect(page.getByRole('alert').filter({ hasText: 'End time must be after start time' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Monday' }).getByRole('button', { name: 'Bio 10:00–09:00' })).toHaveCount(0)
})

test('[A9] a saved class survives a reload', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  await page.reload()
  const block = page.getByRole('region', { name: 'Monday' }).getByRole('button', { name: 'Physics 08:00–09:00' })
  await expect(block).toBeVisible()
})
