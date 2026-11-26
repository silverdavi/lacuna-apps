import { promises as fs } from 'fs'
import { expect, test, type Page } from '@playwright/test'

// Creates the "Jane Doe" appointment used across the acceptance checks.
// June 15, 2025 is a Monday (matches A3/A4).
async function addJane(page: Page) {
  await page.getByRole('button', { name: 'New appointment' }).click()
  await page.getByLabel('Client name').fill('Jane Doe')
  await page.getByLabel('Date').fill('2025-06-15')
  await page.getByLabel('Start time').fill('09:00')
  await page.getByLabel('End time').fill('10:00')
  await page.getByLabel('Notes').fill('Initial consultation')
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] month grid shows heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Appointment Booking' })).toBeVisible()
  await expect(page.getByText('No appointments yet')).toBeVisible()
})

test('[A2] creating an appointment shows a block on its date in the month grid', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  const block = page.getByText('Jane Doe').first()
  await expect(block).toBeVisible()
  await expect(page.getByText('No appointments yet')).toHaveCount(0)
})

test('[A3] week view shows the appointment at its time slot with notes', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  await page.getByRole('tab', { name: 'Week' }).click()
  const block = page.getByText('Jane Doe').first()
  await expect(block).toBeVisible()
  await expect(page.getByText('Initial consultation')).toBeVisible()
  await expect(page.getByText(/09:00/)).toBeVisible()
})

test('[A4] editing end time in the detail dialog updates the week block', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  await page.getByRole('tab', { name: 'Week' }).click()
  await page.getByText('Jane Doe').first().click()
  await expect(page.getByText('Client name: Jane Doe', { exact: true })).toBeVisible()
  await expect(page.getByText('Date: 2025-06-15', { exact: true })).toBeVisible()
  await expect(page.getByText('Start time: 09:00', { exact: true })).toBeVisible()
  await expect(page.getByText('End time: 10:00', { exact: true })).toBeVisible()
  await expect(page.getByText('Notes: Initial consultation', { exact: true })).toBeVisible()
  await page.getByLabel('End time').fill('11:00')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('09:00 – 11:00', { exact: true })).toBeVisible()
})

test('[A5] deleting an appointment removes the block and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  await page.getByRole('tab', { name: 'Week' }).click()
  await page.getByText('Jane Doe').first().click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Jane Doe')).toHaveCount(0)
  await expect(page.getByText('No appointments yet')).toBeVisible()
})

test('[A6] saving Monday availability shows a confirmation', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Day of week').selectOption('Monday')
  await page.getByLabel('Start time').fill('08:00')
  await page.getByLabel('End time').fill('17:00')
  await page.getByRole('button', { name: 'Save availability' }).click()
  await expect(page.getByText('Availability saved for Monday')).toBeVisible()
})

test('[A7] exporting an ics file contains the event when one exists', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('appointments.ics')
  const path = await download.path()
  const content = await fs.readFile(path!, 'utf8')
  expect(content).toContain('BEGIN:VEVENT')
  expect(content).toContain('Jane Doe')
})

test('[A8] search filters the month grid by client name', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  await page.getByLabel('Search appointments').fill('Jane')
  await expect(page.getByText('Jane Doe').first()).toBeVisible()
  await page.getByLabel('Search appointments').fill('zzz')
  await expect(page.getByText('No appointments match')).toBeVisible()
})

test('[A9] appointment and availability persist across a reload', async ({ page }) => {
  await page.goto('/')
  await addJane(page)
  await page.getByRole('tab', { name: 'Settings' }).click()
  await page.getByLabel('Day of week').selectOption('Monday')
  await page.getByLabel('Start time').fill('08:00')
  await page.getByLabel('End time').fill('17:00')
  await page.getByRole('button', { name: 'Save availability' }).click()
  await page.reload()
  await expect(page.getByText('Jane Doe').first()).toBeVisible()
  await page.getByRole('tab', { name: 'Settings' }).click()
  await expect(page.getByLabel('Day of week')).toHaveValue('Monday')
  await expect(page.getByLabel('Start time')).toHaveValue('08:00')
  await expect(page.getByLabel('End time')).toHaveValue('17:00')
})
