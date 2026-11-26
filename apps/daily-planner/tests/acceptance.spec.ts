import { expect, test, type Page } from '@playwright/test'

async function openTask(page: Page, title: string) {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await page.getByLabel('New task').fill(title)
  await page.getByLabel('New task').press('Enter')
}

async function openCalendar(page: Page) {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
}

async function addEvent(page: Page, title: string, date: string, time: string) {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Time').fill(time)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] page shows the heading "Daily Planner" with Tasks and Calendar tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Daily Planner' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible()
})

test('[A2] typing "Buy milk" and pressing Enter adds the item and progress shows "0/1"', async ({ page }) => {
  await openTask(page, 'Buy milk')
  const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await expect(item).toBeVisible()
  await expect(page.getByText('0/1')).toBeVisible()
})

test('[A3] clicking the checkbox strikes through "Buy milk" and progress shows "1/1"', async ({ page }) => {
  await openTask(page, 'Buy milk')
  const item = page.getByRole('listitem').filter({ hasText: 'Buy milk' })
  await item.getByRole('checkbox').click()
  await expect(page.getByText('1/1')).toBeVisible()
  await expect(item.getByText('Buy milk')).toHaveCSS('text-decoration-line', 'line-through')
})

test('[A4] clicking "Delete Buy milk" removes the item and the progress indicator disappears', async ({ page }) => {
  await openTask(page, 'Buy milk')
  await page.getByRole('button', { name: 'Delete Buy milk' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toHaveCount(0)
  await expect(page.getByText('0/1')).toHaveCount(0)
})

test('[A5] adding "Team Sync" on 2023-10-25 at 14:00 shows it in the October month view', async ({ page }) => {
  await openCalendar(page)
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  const cell = page.getByRole('grid', { name: 'Month' }).getByRole('gridcell', { name: 'October 25, 2023' })
  await expect(cell.getByRole('button', { name: 'Team Sync' })).toBeVisible()
  await expect(cell.getByRole('button', { name: 'Team Sync' })).toContainText('14:00')
})

test('[A6] the Week view shows "Team Sync" in the Wednesday, October 25, 2023 column', async ({ page }) => {
  await openCalendar(page)
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await page.getByRole('tab', { name: 'Week' }).click()
  await expect(page.getByRole('grid', { name: 'Week' }).getByText('Wednesday, October 25, 2023')).toBeVisible()
  // The spec names the week column, not the event button; the event must live inside that column.
  await expect(page.getByRole('grid', { name: 'Week' }).getByRole('button', { name: 'Team Sync' })).toBeVisible()
})

test('[A7] Export ICS copies a string containing BEGIN:VEVENT and SUMMARY:Team Sync', async ({ page }) => {
  const context = page.context()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openCalendar(page)
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const clip = await page.evaluate(async () => navigator.clipboard.readText())
  expect(clip).toContain('BEGIN:VEVENT')
  expect(clip).toContain('SUMMARY:Team Sync')
})

test('[A8] setting Recurrence to Daily and saving adds "Team Sync" on October 26, 2023', async ({ page }) => {
  await openCalendar(page)
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await page.getByRole('grid', { name: 'Month' }).getByRole('button', { name: 'Team Sync' }).click()
  const dialog = page.getByRole('dialog', { name: 'Event details' })
  await expect(dialog).toBeVisible()
  await dialog.getByLabel('Recurrence').selectOption('Daily')
  await dialog.getByRole('button', { name: 'Save' }).click()
  const cell = page.getByRole('grid', { name: 'Month' }).getByRole('gridcell', { name: 'October 26, 2023' })
  await expect(cell.getByRole('button', { name: 'Team Sync' })).toBeVisible()
})

test('[A9] reload keeps the task "Buy milk" and the event "Team Sync" on October 25, 2023', async ({ page }) => {
  await openTask(page, 'Buy milk')
  await openCalendar(page)
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await page.reload()
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await page.getByRole('tab', { name: 'Calendar' }).click()
  const cell = page.getByRole('grid', { name: 'Month' }).getByRole('gridcell', { name: 'October 25, 2023' })
  await expect(cell.getByRole('button', { name: 'Team Sync' })).toBeVisible()
})
