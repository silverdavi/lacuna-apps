import { expect, test, type Page } from '@playwright/test'

async function addTeamSync(page: Page) {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill('Team Sync')
  await page.getByLabel('Day').fill('Tue')
  await page.getByLabel('Time').fill('10:00')
  await page.getByRole('button', { name: 'Save' }).click()
}

async function addReviewPr(page: Page) {
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('New task').fill('Review PR')
  await page.getByLabel('New task').press('Enter')
}

test('[A1] heading and the seven week days are visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Weekly Planner' })).toBeVisible()
  for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
    await expect(page.getByText(day, { exact: true })).toBeVisible()
  }
})

test('[A2] saving a new event adds a card with the title and time', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  const card = page.getByRole('listitem').filter({ hasText: 'Team Sync' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('10:00')
})

test('[A3] adding a task shows a checkable item and progress "1 of 1"', async ({ page }) => {
  await page.goto('/')
  await addReviewPr(page)
  const item = page.getByRole('listitem').filter({ hasText: 'Review PR' })
  await expect(item).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Review PR' })).not.toBeChecked()
  await expect(page.getByText('1 of 1')).toBeVisible()
})

test('[A4] checking the task marks it done, updates progress, and strikes the text', async ({ page }) => {
  await page.goto('/')
  await addReviewPr(page)
  await page.getByRole('checkbox', { name: 'Review PR' }).click()
  await expect(page.getByRole('checkbox', { name: 'Review PR' })).toBeChecked()
  await expect(page.getByText('1 of 1 done')).toBeVisible()
  const style = await page
    .getByRole('listitem')
    .filter({ hasText: 'Review PR' })
    .getByText('Review PR', { exact: true })
    .evaluate((el) => getComputedStyle(el).textDecoration)
  await expect(style).toContain('line-through')
})

// A5: the event is placed on a day within the displayed month, so its cell is
// whatever day of that month holds it; assert it lands in some month cell.
test('[A5] the Month tab shows the current month and the event in a day cell', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await page.getByRole('tab', { name: 'Month' }).click()
  const month = new Date().toLocaleString('en-US', { month: 'long' })
  await expect(page.getByText(month)).toBeVisible()
  await expect(page.getByRole('cell').filter({ hasText: 'Team Sync' })).toBeVisible()
})

test('[A6] Export ICS copies an ICS string for the event', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addTeamSync(page)
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('BEGIN:VEVENT')
  expect(text).toContain('SUMMARY:Team Sync')
  expect(text).toContain('END:VEVENT')
})

test('[A7] deleting the event removes it from the Tue column', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await page.getByRole('button', { name: 'Delete Team Sync' }).click()
  await expect(page.getByText('Team Sync', { exact: true })).toHaveCount(0)
})

test('[A8] deleting the task shows "No tasks yet" and hides the progress indicator', async ({ page }) => {
  await page.goto('/')
  await addReviewPr(page)
  await page.getByRole('button', { name: 'Delete Review PR' }).click()
  await expect(page.getByText('No tasks yet')).toBeVisible()
  await expect(page.getByText('1 of 1')).toHaveCount(0)
  await expect(page.getByText('1 of 1 done')).toHaveCount(0)
})

test('[A9] reload keeps the event on Tue at 10:00 and the task unchecked', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await addReviewPr(page)
  await page.reload()
  const card = page.getByRole('listitem').filter({ hasText: 'Team Sync' })
  await expect(card).toBeVisible()
  await expect(card).toContainText('10:00')
  await expect(page.getByRole('checkbox', { name: 'Review PR' })).not.toBeChecked()
})
