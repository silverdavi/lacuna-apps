import { expect, test, type Page } from '@playwright/test'

function item(page: Page, name: string) {
  return page.getByRole('listitem').filter({ hasText: name })
}

test('[A1] empty app shows the heading, "No events yet" and both tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Event Countdown' })).toBeVisible()
  await expect(page.getByText('No events yet')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Upcoming' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Past' })).toBeVisible()
})

test('[A2] adding Birthday on 2025-12-25 18:00 shows a list item with "in 1d 0h 0m 0s"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Birthday')
  await page.getByLabel('Date').fill('2025-12-25')
  await page.getByLabel('Time').fill('18:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  const entry = item(page, 'Birthday')
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('in 1d 0h 0m 0s')
})

test('[A3] the Birthday item keeps showing "in 1d 0h 0m 0s"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Birthday')
  await page.getByLabel('Date').fill('2025-12-25')
  await page.getByLabel('Time').fill('18:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await expect(item(page, 'Birthday')).toContainText('in 1d 0h 0m 0s')
})

test('[A4] clicking "Delete Birthday" removes the item and shows "No events yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Birthday')
  await page.getByLabel('Date').fill('2025-12-25')
  await page.getByLabel('Time').fill('18:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await expect(item(page, 'Birthday')).toBeVisible()
  await page.getByRole('button', { name: 'Delete Birthday' }).click()
  await expect(item(page, 'Birthday')).toHaveCount(0)
  await expect(page.getByText('No events yet')).toBeVisible()
})

test('[A5] adding a past Meeting on 2025-12-20 09:00 shows "passed 4d 9h 0m 0s ago"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Meeting')
  await page.getByLabel('Date').fill('2025-12-20')
  await page.getByLabel('Time').fill('09:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  const entry = item(page, 'Meeting')
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('passed 4d 9h 0m 0s ago')
})

test('[A6] the Past tab shows "passed 4d 9h 0m 0s ago" and hides Birthday', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Birthday')
  await page.getByLabel('Date').fill('2025-12-25')
  await page.getByLabel('Time').fill('18:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Event name').fill('Meeting')
  await page.getByLabel('Date').fill('2025-12-20')
  await page.getByLabel('Time').fill('09:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByRole('tab', { name: 'Past' }).click()
  await expect(item(page, 'Meeting')).toContainText('passed 4d 9h 0m 0s ago')
  await expect(item(page, 'Birthday')).toHaveCount(0)
})

test('[A7] the Upcoming tab shows "in 1d 0h 0m 0s" and hides Meeting', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Birthday')
  await page.getByLabel('Date').fill('2025-12-25')
  await page.getByLabel('Time').fill('18:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Event name').fill('Meeting')
  await page.getByLabel('Date').fill('2025-12-20')
  await page.getByLabel('Time').fill('09:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByRole('tab', { name: 'Past' }).click()
  await page.getByRole('tab', { name: 'Upcoming' }).click()
  await expect(item(page, 'Birthday')).toContainText('in 1d 0h 0m 0s')
  await expect(item(page, 'Meeting')).toHaveCount(0)
})

test('[A8] quick adding "1h 20m" adds a Quick event showing "in 1h 20m 0s"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Quick add duration').fill('1h 20m')
  await page.getByRole('button', { name: 'Add quick event' }).click()
  const entry = item(page, 'Quick event')
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('in 1h 20m 0s')
})

test('[A9] the Birthday event and its countdown survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Event name').fill('Birthday')
  await page.getByLabel('Date').fill('2025-12-25')
  await page.getByLabel('Time').fill('18:00')
  await page.getByRole('button', { name: 'Add event' }).click()
  await expect(item(page, 'Birthday')).toContainText('in 1d 0h 0m 0s')
  await page.reload()
  await expect(item(page, 'Birthday')).toContainText('in 1d 0h 0m 0s')
})
