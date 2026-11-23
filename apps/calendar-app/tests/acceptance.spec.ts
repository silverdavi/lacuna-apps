import { promises as fs } from 'fs'
import { expect, test, type Page } from '@playwright/test'

// Adds "Team Sync" on 2024-06-15 10:00 using the Add event form.
async function addTeamSync(page: Page) {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill('Team Sync')
  await page.getByLabel('Date').fill('2024-06-15')
  await page.getByLabel('Time').fill('10:00')
  await page.getByRole('button', { name: 'Save' }).click()
}

// The grid is anchored to the current month, which is not fixed. Walk back with
// "Previous month" until the given event title becomes visible (June 2024 at
// most ~240 months back covers any plausible today).
async function walkTo(page: Page, title: string) {
  for (let i = 0; i < 240; i++) {
    if (await page.getByText(title, { exact: true }).count() > 0) return
    await page.getByRole('button', { name: 'Previous month' }).click()
  }
}

// A valid ICS file with one event, summary "Imported Event", on 2024-06-20.
const IMPORT_ICS =
  'BEGIN:VCALENDAR\r\n' +
  'VERSION:2.0\r\n' +
  'PRODID:-//Test//EN\r\n' +
  'BEGIN:VEVENT\r\n' +
  'UID:imported-event-1@test\r\n' +
  'DTSTAMP:20240601T000000Z\r\n' +
  'DTSTART:20240620T090000Z\r\n' +
  'SUMMARY:Imported Event\r\n' +
  'END:VEVENT\r\n' +
  'END:VCALENDAR\r\n'

async function importIcs(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import ICS' }).click(),
  ])
  await chooser.setFiles({
    name: 'import.ics',
    mimeType: 'text/calendar',
    buffer: Buffer.from(IMPORT_ICS),
  })
}

test('[A1] page shows the "Personal Calendar" heading and a month grid with the current month', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Personal Calendar' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add event' })).toBeVisible()
  // Day 28 exists in every month, so it proves the grid renders the current
  // month's days without depending on today's date.
  await expect(page.getByText('28', { exact: true })).toBeVisible()
})

test('[A2] adding "Team Sync" on 2024-06-15 10:00 shows the event on June 15', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await walkTo(page, 'Team Sync')
  await expect(page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' })).toBeVisible()
})

test('[A3] clicking "Team Sync" opens a detail view with title, date and time', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await walkTo(page, 'Team Sync')
  await page.getByText('Team Sync', { exact: true }).first().click()
  await expect(page.getByText('Team Sync', { exact: true })).toBeVisible()
  await expect(page.getByText('2024-06-15', { exact: true })).toBeVisible()
  await expect(page.getByText('10:00', { exact: true })).toBeVisible()
})

test('[A4] clicking Delete in the detail view removes "Team Sync" from the grid', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await walkTo(page, 'Team Sync')
  await page.getByText('Team Sync', { exact: true }).first().click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Team Sync', { exact: true })).toHaveCount(0)
})

test('[A5] Export ICS with an event downloads "calendar.ics" containing the event', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('calendar.ics')
  const path = await download.path()
  const content = await fs.readFile(path!, 'utf8')
  expect(content).toContain('BEGIN:VEVENT')
  expect(content).toContain('SUMMARY:Team Sync')
})

test('[A5] Export ICS with no events downloads "calendar.ics" containing "BEGIN:VCALENDAR"', async ({
  page,
}) => {
  await page.goto('/')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('calendar.ics')
  const path = await download.path()
  const content = await fs.readFile(path!, 'utf8')
  expect(content).toContain('BEGIN:VCALENDAR')
})

test('[A6] Import ICS with "Imported Event" on 2024-06-20 adds the event to June 20', async ({
  page,
}) => {
  await page.goto('/')
  await importIcs(page)
  await walkTo(page, 'Imported Event')
  await expect(page.getByText('20', { exact: true }).filter({ hasText: 'Imported Event' })).toBeVisible()
})

test('[A7] "Next month" then "Previous month" changes the grid and back', async ({ page }) => {
  await page.goto('/')
  // In an empty calendar the only four-digit year on the page is the month
  // title, so it is a stable marker of which month the grid shows.
  const label = async () => (await page.getByText(/\b(19|20)\d\d\b/).first().textContent())?.trim()
  const start = await label()
  await page.getByRole('button', { name: 'Next month' }).click()
  const next = await label()
  expect(next).not.toEqual(start)
  await page.getByRole('button', { name: 'Previous month' }).click()
  expect(await label()).toEqual(start)
})

test('[A8] saving with an empty Title shows "Title is required" and does not add the event', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add event' }).click()
  // Leave Title empty; fill the rest so only the title is missing.
  await page.getByLabel('Date').fill('2024-06-15')
  await page.getByLabel('Time').fill('10:00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Title is required')).toBeVisible()
  // The rejected save must not create an event on June 15.
  await walkTo(page, 'Team Sync')
  await expect(page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' })).toHaveCount(0)
})

test('[A9] "Team Sync" survives a reload on June 15', async ({ page }) => {
  await page.goto('/')
  await addTeamSync(page)
  await walkTo(page, 'Team Sync')
  await expect(page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' })).toBeVisible()
  await page.reload()
  await walkTo(page, 'Team Sync')
  await expect(page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' })).toBeVisible()
})
