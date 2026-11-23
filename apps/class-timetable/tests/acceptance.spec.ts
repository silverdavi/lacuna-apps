import { expect, test } from '@playwright/test'

async function addClass(page: import('@playwright/test').Page, name: string, day: string, start: string, end: string) {
  await page.getByLabel('Class name').fill(name)
  await page.getByLabel('Day').selectOption(day)
  await page.getByLabel('Start time').fill(start)
  await page.getByLabel('End time').fill(end)
  await page.getByRole('button', { name: 'Add class' }).click()
}

test('[A1] empty app shows the heading and the week grid with Monday through Friday', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Class Timetable' })).toBeVisible()
  // The week grid is the default view; the app must not require a tab click to see it.
  await expect(page.getByRole('tab', { name: 'Table' })).toHaveCount(1)
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
    await expect(page.getByText(day, { exact: true })).toBeVisible()
  }
  // No class has been added, so no class block exists in the grid.
  for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) {
    await expect(page.locator('h2', { hasText: day }).locator('..')).not.toHaveText('09:00')
    await expect(page.locator('h2', { hasText: day }).locator('..')).not.toHaveText('08:00')
  }
})

test('[A2] adding Math Monday 09:00-10:00 shows a block in the Monday column', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  const block = page.getByText('Math', { exact: true }).first()
  await expect(block).toBeVisible()
  // The block itself carries the name and the "09:00–10:00" range in the Monday column.
  await expect(page.locator('h2', { hasText: 'Monday' }).locator('..').getByText('Math', { exact: true })).toContainText('09:00–10:00')
})

test('[A3] the Table tab lists the class and the Class name header sorts the table', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await page.getByRole('tab', { name: 'Table' }).click()
  const table = page.getByRole('table')
  await expect(table.getByRole('row').filter({ hasText: 'Math' })).toContainText('Monday')
  await expect(table.getByRole('row').filter({ hasText: 'Math' })).toContainText('09:00')
  await expect(table.getByRole('row').filter({ hasText: 'Math' })).toContainText('10:00')
  const header = table.getByRole('columnheader', { name: 'Class name' })
  await header.click()
  const firstDataRow = table.getByRole('row').nth(1)
  await expect(firstDataRow).toContainText('Math')
  // Sorting again must not reorder a single-row table away from "Math".
  await header.click()
  await expect(table.getByRole('row').nth(1)).toContainText('Math')
})

test('[A4] adding Physics before Math leaves two blocks in the Monday column', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  const mondayColumn = page.locator('h2', { hasText: 'Monday' }).locator('..')
  await expect(mondayColumn.getByText('Math', { exact: true })).toHaveCount(1)
  await expect(mondayColumn.getByText('Physics', { exact: true })).toHaveCount(1)
  // Each block carries its name and time range in the Monday column.
  await expect(mondayColumn.getByText('Math', { exact: true })).toContainText('09:00–10:00')
  await expect(mondayColumn.getByText('Physics', { exact: true })).toContainText('08:00–09:00')
})

test('[A5] clicking the Math block opens a detail panel and Delete class removes it', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  await page.getByText('Math', { exact: true }).first().click()
  const panel = page.getByRole('button', { name: 'Delete class' }).locator('..')
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Delete class' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete class' }).click()
  const mondayColumn = page.locator('h2', { hasText: 'Monday' }).locator('..')
  await expect(mondayColumn.getByText('Math', { exact: true })).toHaveCount(0)
  await expect(mondayColumn.getByText('Physics', { exact: true })).toHaveCount(1)
})

test('[A6] adding Chemistry on Tuesday shows a block in the Tuesday column', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Chemistry', 'Tuesday', '11:00', '12:00')
  // The block itself carries the name and the "11:00–12:00" range in the Tuesday column.
  await expect(page.locator('h2', { hasText: 'Tuesday' }).locator('..').getByText('Chemistry', { exact: true })).toContainText('11:00–12:00')
})

test('[A7] Export ICS copies an ICS string containing both summaries to the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addClass(page, 'Math', 'Monday', '09:00', '10:00')
  await addClass(page, 'Chemistry', 'Tuesday', '11:00', '12:00')
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const ics = await page.evaluate(() => navigator.clipboard.readText())
  expect(ics).toContain('SUMMARY:Math')
  expect(ics).toContain('SUMMARY:Chemistry')
})

test('[A8] an end time before the start time shows an error and adds no block', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Bio', 'Monday', '10:00', '09:00')
  await expect(page.getByText('End time must be after start time')).toBeVisible()
  // No block was added anywhere in the grid, including the Monday column.
  await expect(page.getByText('Bio', { exact: true })).toHaveCount(0)
  await expect(page.locator('h2', { hasText: 'Monday' }).locator('..').getByText('Bio', { exact: true })).toHaveCount(0)
})

test('[A9] Physics Monday 08:00-09:00 survives a reload in the week grid', async ({ page }) => {
  await page.goto('/')
  await addClass(page, 'Physics', 'Monday', '08:00', '09:00')
  await page.reload()
  // The block itself carries the name and the "08:00–09:00" range in the Monday column.
  await expect(page.locator('h2', { hasText: 'Monday' }).locator('..').getByText('Physics', { exact: true })).toContainText('08:00–09:00')
})
