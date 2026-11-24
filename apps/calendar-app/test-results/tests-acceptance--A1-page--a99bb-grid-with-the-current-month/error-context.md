# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] page shows the "Personal Calendar" heading and a month grid with the current month
- Location: tests/acceptance.spec.ts:48:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { promises as fs } from 'fs'
  2   | import { expect, test, type Page } from '@playwright/test'
  3   | 
  4   | // Adds "Team Sync" on 2024-06-15 10:00 using the Add event form.
  5   | async function addTeamSync(page: Page) {
  6   |   await page.getByRole('button', { name: 'Add event' }).click()
  7   |   await page.getByLabel('Title').fill('Team Sync')
  8   |   await page.getByLabel('Date').fill('2024-06-15')
  9   |   await page.getByLabel('Time').fill('10:00')
  10  |   await page.getByRole('button', { name: 'Save' }).click()
  11  | }
  12  | 
  13  | // The grid is anchored to the current month, which is not fixed. Walk back with
  14  | // "Previous month" until the given event title becomes visible (June 2024 at
  15  | // most ~240 months back covers any plausible today).
  16  | async function walkTo(page: Page, title: string) {
  17  |   for (let i = 0; i < 240; i++) {
  18  |     if (await page.getByText(title, { exact: true }).count() > 0) return
  19  |     await page.getByRole('button', { name: 'Previous month' }).click()
  20  |   }
  21  | }
  22  | 
  23  | // A valid ICS file with one event, summary "Imported Event", on 2024-06-20.
  24  | const IMPORT_ICS =
  25  |   'BEGIN:VCALENDAR\r\n' +
  26  |   'VERSION:2.0\r\n' +
  27  |   'PRODID:-//Test//EN\r\n' +
  28  |   'BEGIN:VEVENT\r\n' +
  29  |   'UID:imported-event-1@test\r\n' +
  30  |   'DTSTAMP:20240601T000000Z\r\n' +
  31  |   'DTSTART:20240620T090000Z\r\n' +
  32  |   'SUMMARY:Imported Event\r\n' +
  33  |   'END:VEVENT\r\n' +
  34  |   'END:VCALENDAR\r\n'
  35  | 
  36  | async function importIcs(page: Page) {
  37  |   const [chooser] = await Promise.all([
  38  |     page.waitForEvent('filechooser'),
  39  |     page.getByRole('button', { name: 'Import ICS' }).click(),
  40  |   ])
  41  |   await chooser.setFiles({
  42  |     name: 'import.ics',
  43  |     mimeType: 'text/calendar',
  44  |     buffer: Buffer.from(IMPORT_ICS),
  45  |   })
  46  | }
  47  | 
  48  | test('[A1] page shows the "Personal Calendar" heading and a month grid with the current month', async ({
  49  |   page,
  50  | }) => {
> 51  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  52  |   await expect(page.getByRole('heading', { name: 'Personal Calendar' })).toBeVisible()
  53  |   await expect(page.getByRole('button', { name: 'Previous month' })).toBeVisible()
  54  |   await expect(page.getByRole('button', { name: 'Next month' })).toBeVisible()
  55  |   await expect(page.getByRole('button', { name: 'Add event' })).toBeVisible()
  56  |   // Day 28 exists in every month, so it proves the grid renders the current
  57  |   // month's days without depending on today's date.
  58  |   await expect(page.getByText('28', { exact: true })).toBeVisible()
  59  | })
  60  | 
  61  | test('[A2] adding "Team Sync" on 2024-06-15 10:00 shows the event on June 15', async ({ page }) => {
  62  |   await page.goto('/')
  63  |   await addTeamSync(page)
  64  |   await walkTo(page, 'Team Sync')
  65  |   await expect(page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' })).toBeVisible()
  66  | })
  67  | 
  68  | test('[A3] clicking "Team Sync" opens a detail view with title, date and time', async ({ page }) => {
  69  |   await page.goto('/')
  70  |   await addTeamSync(page)
  71  |   await walkTo(page, 'Team Sync')
  72  |   await page.getByText('Team Sync', { exact: true }).first().click()
  73  |   await expect(page.getByText('Team Sync', { exact: true })).toBeVisible()
  74  |   await expect(page.getByText('2024-06-15', { exact: true })).toBeVisible()
  75  |   await expect(page.getByText('10:00', { exact: true })).toBeVisible()
  76  | })
  77  | 
  78  | test('[A4] clicking Delete in the detail view removes "Team Sync" from the grid', async ({ page }) => {
  79  |   await page.goto('/')
  80  |   await addTeamSync(page)
  81  |   await walkTo(page, 'Team Sync')
  82  |   await page.getByText('Team Sync', { exact: true }).first().click()
  83  |   await page.getByRole('button', { name: 'Delete' }).click()
  84  |   await expect(page.getByText('Team Sync', { exact: true })).toHaveCount(0)
  85  | })
  86  | 
  87  | test('[A5] Export ICS with an event downloads "calendar.ics" containing the event', async ({ page }) => {
  88  |   await page.goto('/')
  89  |   await addTeamSync(page)
  90  |   const [download] = await Promise.all([
  91  |     page.waitForEvent('download'),
  92  |     page.getByRole('button', { name: 'Export ICS' }).click(),
  93  |   ])
  94  |   expect(download.suggestedFilename()).toBe('calendar.ics')
  95  |   const path = await download.path()
  96  |   const content = await fs.readFile(path!, 'utf8')
  97  |   expect(content).toContain('BEGIN:VEVENT')
  98  |   expect(content).toContain('SUMMARY:Team Sync')
  99  | })
  100 | 
  101 | test('[A5] Export ICS with no events downloads "calendar.ics" containing "BEGIN:VCALENDAR"', async ({
  102 |   page,
  103 | }) => {
  104 |   await page.goto('/')
  105 |   const [download] = await Promise.all([
  106 |     page.waitForEvent('download'),
  107 |     page.getByRole('button', { name: 'Export ICS' }).click(),
  108 |   ])
  109 |   expect(download.suggestedFilename()).toBe('calendar.ics')
  110 |   const path = await download.path()
  111 |   const content = await fs.readFile(path!, 'utf8')
  112 |   expect(content).toContain('BEGIN:VCALENDAR')
  113 | })
  114 | 
  115 | test('[A6] Import ICS with "Imported Event" on 2024-06-20 adds the event to June 20', async ({
  116 |   page,
  117 | }) => {
  118 |   await page.goto('/')
  119 |   await importIcs(page)
  120 |   await walkTo(page, 'Imported Event')
  121 |   await expect(page.getByText('20', { exact: true }).filter({ hasText: 'Imported Event' })).toBeVisible()
  122 | })
  123 | 
  124 | test('[A7] "Next month" then "Previous month" changes the grid and back', async ({ page }) => {
  125 |   await page.goto('/')
  126 |   // In an empty calendar the only four-digit year on the page is the month
  127 |   // title, so it is a stable marker of which month the grid shows.
  128 |   const label = async () => (await page.getByText(/\b(19|20)\d\d\b/).first().textContent())?.trim()
  129 |   const start = await label()
  130 |   await page.getByRole('button', { name: 'Next month' }).click()
  131 |   const next = await label()
  132 |   expect(next).not.toEqual(start)
  133 |   await page.getByRole('button', { name: 'Previous month' }).click()
  134 |   expect(await label()).toEqual(start)
  135 | })
  136 | 
  137 | test('[A8] saving with an empty Title shows "Title is required" and does not add the event', async ({
  138 |   page,
  139 | }) => {
  140 |   await page.goto('/')
  141 |   await page.getByRole('button', { name: 'Add event' }).click()
  142 |   // Leave Title empty; fill the rest so only the title is missing.
  143 |   await page.getByLabel('Date').fill('2024-06-15')
  144 |   await page.getByLabel('Time').fill('10:00')
  145 |   await page.getByRole('button', { name: 'Save' }).click()
  146 |   await expect(page.getByText('Title is required')).toBeVisible()
  147 |   // The rejected save must not create an event on June 15.
  148 |   await walkTo(page, 'Team Sync')
  149 |   await expect(page.getByText('15', { exact: true }).filter({ hasText: 'Team Sync' })).toHaveCount(0)
  150 | })
  151 | 
```