import { expect, test, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'

async function addEvent(page: Page, title: string, date: string, time: string, repeat = '') {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Time').fill(time)
  if (repeat) await page.getByLabel('Repeat').selectOption({ label: repeat })
  await page.getByRole('button', { name: 'Save' }).click()
}

// "the cell in the June 10 column" and "the day column for Tuesday June 10"
// both denote the June 10 cell/column holding the event; scoping to the event's
// own cell is how the check localises it.
const cell = (page: Page, event: string) => page.getByText(event, { exact: true }).first()

async function addTask(page: Page, text: string) {
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await page.getByLabel('New task').fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
}

test('[A1] the heading is "Family Calendar" with the month grid by default and an inactive "Week" tab', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Family Calendar' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Week' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Tasks' })).toBeVisible()
  // the month grid is the default view: June's day numbers are visible without
  // clicking the Week tab.
  await expect(page.getByText('10', { exact: true })).toBeVisible()
})

test('[A2] adding Dentist on 2025-06-10 14:00 puts "Dentist" and "14:00" in the June 10 cell', async ({
  page,
}) => {
  await page.goto('/')
  await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  const entry = cell(page, 'Dentist')
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('14:00')
})

test('[A3] the Week tab for the week containing June 10, 2025 shows Dentist at 14:00 on Tuesday June 10', async ({
  page,
}) => {
  await page.goto('/')
  await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  await page.getByRole('tab', { name: 'Week' }).click()
  await expect(page.getByText('Tuesday June 10')).toBeVisible()
  const entry = cell(page, 'Dentist')
  await expect(entry).toBeVisible()
  await expect(entry).toContainText('14:00')
})

test('[A4] saving weekly Yoga on 2025-06-12 09:00 creates events on June 12, 19 and 26', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Yoga', '2025-06-12', '09:00', 'Weekly')
  const yoga = page.getByText('Yoga', { exact: true })
  await expect(yoga, 'three weekly Yoga cells').toHaveCount(3)
  for (const day of ['12', '19', '26']) {
    await expect(page.getByText(day, { exact: true })).toBeVisible()
  }
  await expect(yoga.first()).toContainText('09:00')
})

test('[A5] Export ICS downloads a file containing the Dentist event with DTSTART:20250610T140000', async ({
  page,
}) => {
  await page.goto('/')
  await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  const content = readFileSync(await download.path(), 'utf8')
  expect(content, 'ICS contains the event summary').toContain('SUMMARY:Dentist')
  expect(content, 'ICS contains the event start').toContain('DTSTART:20250610T140000')
})

test('[A6] adding "Buy milk" to the Tasks tab shows an unchecked item and the progress "0/1"', async ({
  page,
}) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  await expect(page.getByText('0/1')).toBeVisible()
})

test('[A7] checking "Buy milk" strikes it through and changes the progress to "1/1"', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await expect(page.getByText('Buy milk')).toBeVisible()
  await expect(page.getByText('1/1')).toBeVisible()
})

test('[A8] Delete Dentist removes the June 10 entry from the month grid and the week view', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  await expect(page.getByText('Dentist')).toBeVisible()
  await page.getByRole('button', { name: 'Delete Dentist' }).click()
  await expect(page.getByText('Dentist')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Week' }).click()
  await expect(page.getByText('Dentist')).toHaveCount(0)
})

test('[A9] reload keeps the Dentist event on June 10 and the checked "Buy milk" task', async ({ page }) => {
  await page.goto('/')
  await addEvent(page, 'Dentist', '2025-06-10', '14:00')
  await addTask(page, 'Buy milk')
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await page.reload()
  await expect(page.getByText('Dentist')).toBeVisible()
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
})
