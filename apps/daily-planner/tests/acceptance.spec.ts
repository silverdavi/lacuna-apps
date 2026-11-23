import { expect, test, type Page } from '@playwright/test'

function event(page: Page, title: string) {
  return page.getByText(title, { exact: true }).first()
}

async function addEvent(page: Page, title: string, date: string, time: string) {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Time').fill(time)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] the page shows the heading and both tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Daily Planner' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible()
})

test('[A2] adding "Buy milk" shows a checklist item with progress "0/1"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByLabel('New task').press('Enter')
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await expect(page.getByText('0/1', { exact: true })).toBeVisible()
})

test('[A3] checking "Buy milk" shows "1/1" and strikes through the text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByLabel('New task').press('Enter')
  await page.getByRole('checkbox').first().click()
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
  const struck = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li'))
    const hit = items.find((li) => li.textContent?.includes('Buy milk'))
    return hit
      ? getComputedStyle(hit.querySelector('span, label, div') ?? hit).textDecorationLine
      : 'none'
  })
  expect(struck, 'the task text is struck through').toContain('line-through')
})

test('[A4] clicking "Delete Buy milk" removes the item and the progress', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByLabel('New task').press('Enter')
  await expect(page.getByText('0/1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Buy milk' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toHaveCount(0)
  await expect(page.getByText('0/1', { exact: true })).toHaveCount(0)
})

test('[A5] adding "Team Sync" on 2023-10-25 14:00 shows it in the month view', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await expect(event(page, 'Team Sync')).toBeVisible()
  await expect(event(page, 'Team Sync')).toContainText('14:00')
  await expect(page.getByText('October 2023').first()).toBeVisible()
})

test('[A6] the Week view shows "Team Sync" in the Wednesday, October 25 column', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await page.getByRole('tab', { name: 'Week' }).click()
  const column = page.getByRole('columnheader', { name: /Wednesday/ })
  await expect(column).toBeVisible()
  await expect(column).toContainText('Team Sync')
})

test('[A7] "Export ICS" copies text containing "BEGIN:VEVENT" and "SUMMARY:Team Sync"', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  // grant before the export click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('BEGIN:VEVENT')
  expect(text).toContain('SUMMARY:Team Sync')
})

test('[A8] setting recurrence to Daily adds "Team Sync" on October 26, 2023', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await event(page, 'Team Sync').click()
  await page.getByLabel('Recurrence').selectOption('Daily')
  await page.getByRole('button', { name: 'Save' }).click()
  // A8: a second "Team Sync" appears on October 26, 2023 in the month view.
  await expect(page.getByText('Team Sync', { exact: true })).toHaveCount(2)
})

test('[A9] the task and the event survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByLabel('New task').press('Enter')
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await addEvent(page, 'Team Sync', '2023-10-25', '14:00')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await expect(event(page, 'Team Sync')).toBeVisible()
})
