import { expect, test, type Page } from '@playwright/test'

const cell = (page: Page, name: string) => page.getByRole('gridcell', { name })
const eventButton = (page: Page, date: string, title: string) =>
  cell(page, date).getByRole('button', { name: title })

async function addEvent(page: Page, title: string, date: string, time: string) {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title', { exact: true }).fill(title)
  await page.getByLabel('Date', { exact: true }).fill(date)
  await page.getByLabel('Time', { exact: true }).fill(time)
  await page.getByRole('button', { name: 'Save' }).click()
}

async function icsDownload(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('calendar.ics')
  return (await download.textFile?.()) ?? ''
}

// A month grid named "Month" exists in every month, so the cell for day 28
// is found on the same (current) month the app opens on.
async function expectCell(page: Page, day: number) {
  const heading = await page.getByRole('heading', { name: 'Month title' }).textContent()
  const [monthName, year] = heading!.trim().split(' ')
  const month = monthNames.indexOf(monthName)
  const name = new Date(Date.UTC(Number(year), month, day)).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  await expect(cell(page, name)).toBeVisible()
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

test('[A1] the page shows the "Personal Calendar" heading and a month grid named "Month" with the cell for day 28', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Personal Calendar' })).toBeVisible()
  await expect(page.getByRole('grid', { name: 'Month' })).toBeVisible()
  await expectCell(page, 28)
})

test('[A2] saving a new event adds it to the grid on June 15', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Team Sync', '2024-06-15', '10:00')
  // after "Save" the grid jumps to the saved event's month
  await expect(eventButton(page, 'June 15, 2024', 'Team Sync')).toBeVisible()
})

test('[A3] clicking the event opens a detail view with its title, date, and time', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Team Sync', '2024-06-15', '10:00')
  await eventButton(page, 'June 15, 2024', 'Team Sync').click()
  const dialog = page.getByRole('dialog', { name: 'Event details' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('Title: Team Sync')
  await expect(dialog).toContainText('Date: 2024-06-15')
  await expect(dialog).toContainText('Time: 10:00')
})

test('[A4] "Delete" in the detail view removes the event from the grid', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Team Sync', '2024-06-15', '10:00')
  await expect(eventButton(page, 'June 15, 2024', 'Team Sync')).toBeVisible()
  await eventButton(page, 'June 15, 2024', 'Team Sync').click()
  await page
    .getByRole('dialog', { name: 'Event details' })
    .getByRole('button', { name: 'Delete' })
    .click()
  await expect(eventButton(page, 'June 15, 2024', 'Team Sync')).toHaveCount(0)
})

test('[A5] exporting with an event present downloads a calendar.ics containing the event', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Team Sync', '2024-06-15', '10:00')
  const ics = await icsDownload(page)
  expect(ics).toContain('BEGIN:VEVENT')
  expect(ics).toContain('SUMMARY:Team Sync')
})

test('[A5] exporting with no events downloads a calendar.ics containing a bare calendar', async ({ page }) => {
  await page.goto('/')
  const ics = await icsDownload(page)
  expect(ics).toContain('BEGIN:VCALENDAR')
})

test('[A6] importing an ICS file adds its event to the grid on June 20', async ({ page }) => {
  await page.goto('/')
  const ics =
    'BEGIN:VCALENDAR\r\n' +
    'VERSION:2.0\r\n' +
    'PRODID:-//lacuna-apps//calendar-app//EN\r\n' +
    'BEGIN:VEVENT\r\n' +
    'UID:imported-1@calendar-app\r\n' +
    'DTSTART:20240620T090000Z\r\n' +
    'SUMMARY:Imported Event\r\n' +
    'END:VEVENT\r\n' +
    'END:VCALENDAR\r\n'
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import ICS' }).click(),
  ])
  await chooser.setFiles({ name: 'import.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) })
  await expect(eventButton(page, 'June 20, 2024', 'Imported Event')).toBeVisible()
})

test('[A7] "Next month" shows the next month and "Previous month" returns to the current one', async ({ page }) => {
  await page.goto('/')
  const heading = page.getByRole('heading', { name: 'Month title' })
  const current = (await heading.textContent())!.trim()
  await page.getByRole('button', { name: 'Next month' }).click()
  expect((await heading.textContent())!.trim()).not.toBe(current)
  await page.getByRole('button', { name: 'Previous month' }).click()
  expect((await heading.textContent())!.trim()).toBe(current)
})

test('[A8] saving with an empty title shows "Title is required" and does not add the event', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Date', { exact: true }).fill('2024-06-15')
  await page.getByLabel('Time', { exact: true }).fill('10:00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('Title is required')).toBeVisible()
  await expect(cell(page, 'June 15, 2024')).toHaveCount(0)
})

test('[A9] reloading keeps the event visible in the month grid', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Team Sync', '2024-06-15', '10:00')
  await page.reload()
  await expect(eventButton(page, 'June 15, 2024', 'Team Sync')).toBeVisible()
})
