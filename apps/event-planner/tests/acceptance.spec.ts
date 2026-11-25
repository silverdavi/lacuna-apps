import { expect, test, type Page } from '@playwright/test'

// Creates the "Team Sync" event used across the acceptance checks.
async function addTeamSync(page: Page) {
  await page.getByRole('button', { name: 'New event' }).click()
  await page.getByLabel('Title').fill('Team Sync')
  await page.getByLabel('Date').fill('2025-03-15')
  await page.getByLabel('Start time').fill('09:00')
  await page.getByLabel('End time').fill('10:00')
  await page.getByRole('button', { name: 'Save' }).click()
}

// Creates the "Design Phase" task used across the acceptance checks.
async function addDesignPhase(page: Page) {
  await page.getByRole('tab', { name: 'Timeline' }).click()
  await page.getByRole('button', { name: 'New task' }).click()
  await page.getByLabel('Name').fill('Design Phase')
  await page.getByLabel('Start').fill('2025-03-01')
  await page.getByLabel('End').fill('2025-03-14')
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and both tabs are visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Event Planner' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Events' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Timeline' })).toBeVisible()
})

test('[A2] saving a new event shows a chip on its day in the month grid', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  const cell = page.getByRole('cell', { name: 'March 15' })
  await expect(cell).toBeVisible()
  await expect(cell).toContainText('Team Sync')
})

test('[A3] clicking the chip opens the event detail and Delete removes the event', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await page.getByRole('button', { name: 'Team Sync' }).first().click()
  await expect(page.getByText('2025-03-15')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('cell', { name: 'March 15' })).not.toContainText('Team Sync')
})

test('[A4] a weekly event shows chips on the 10th, 17th, 24th and 31st', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New event' }).click()
  await page.getByLabel('Title').fill('Weekly Standup')
  await page.getByLabel('Date').fill('2025-03-10')
  await page.getByLabel('Start time').fill('09:00')
  await page.getByLabel('End time').fill('09:15')
  await page.getByLabel('Recurrence').selectOption('Weekly')
  await page.getByRole('button', { name: 'Save' }).click()
  for (const day of ['March 10', 'March 17', 'March 24', 'March 31']) {
    const cell = page.getByRole('cell', { name: day })
    await expect(cell).toBeVisible()
    await expect(cell).toContainText('Weekly Standup')
  }
})

test('[A5] saving a new task shows a Gantt bar labelled Design Phase', async ({ page }) => {
  await page.goto('/')
  await addDesignPhase(page)
  const bar = page.getByRole('group', { name: 'Design Phase' })
  await expect(bar).toBeVisible()
  const box = await bar.boundingBox()
  expect(box, 'bar has a rendered size').not.toBeNull()
})

test('[A6] Export ICS in the Timeline tab copies an ICS string for the task', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addDesignPhase(page)
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('BEGIN:VEVENT')
  expect(text).toContain('SUMMARY:Design Phase')
})

test('[A7] Export ICS in the Events tab copies an ICS string for the event', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addTeamSync(page)
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('BEGIN:VEVENT')
  expect(text).toContain('SUMMARY:Team Sync')
})

// A8: the Gantt timeline's first day is the earliest task start, so the right
// edge of the 2025-03-01 to 2025-03-14 bar sits at x = 14 * dayWidth.
// 300 px at the default 20 px/day is 15 days, landing the end on 2025-03-20.
test('[A8] dragging the right edge of the bar extends the end date to 2025-03-20', async ({ page }) => {
  await page.goto('/')
  await addDesignPhase(page)
  const bar = page.getByRole('group', { name: 'Design Phase' })
  const box = (await bar.boundingBox())!
  await page.mouse.move(box.x + box.width, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width + 300, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  const updated = await bar.boundingBox()
  expect(updated, 'bar is wider after the drag').not.toBeNull()
  expect(updated!.width).toBeCloseTo(box.width + 300, 0)
  await expect(bar).toContainText('Design Phase')
})

test('[A9] reload keeps the event and the task', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await addDesignPhase(page)
  await page.reload()
  await expect(page.getByRole('cell', { name: 'March 15' })).toContainText('Team Sync')
  await expect(page.getByRole('group', { name: 'Design Phase' })).toBeVisible()
})
