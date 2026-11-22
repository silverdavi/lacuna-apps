// Acceptance tests for the timezone-converter app.
// Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
// The spec names the two inputs "the date field" and "the time field" and the output
// "the output time field"; tests address them as Date, Time and Result time labels.
import { expect, test, type Page } from '@playwright/test'

function historyRow(page: Page, source: string, target: string) {
  return page.getByRole('row').filter({ hasText: source }).filter({ hasText: target })
}

async function enterConversion(page: Page, source: string, target: string, date: string, time: string) {
  await page.getByLabel('Source timezone').selectOption({ label: source })
  await page.getByLabel('Target timezone').selectOption({ label: target })
  await page.getByLabel('Date').fill(date)
  await page.getByLabel('Time').fill(time)
}

test('[A1] the page heading is "Timezone Converter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Timezone Converter' })).toBeVisible()
})

test('[A2] UTC -> New York on 2024-01-15 14:30 shows 09:30', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'UTC', 'New York', '2024-01-15', '14:30')
  await expect(page.getByLabel('Result time')).toHaveValue('09:30')
})

test('[A3] New York -> Tokyo on 2024-07-15 10:00 shows 23:00', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'New York', 'Tokyo', '2024-07-15', '10:00')
  await expect(page.getByLabel('Result time')).toHaveValue('23:00')
})

test('[A4] saving a UTC -> London conversion on 2024-03-10 12:00 adds a history row', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  await page.getByRole('button', { name: 'Save conversion' }).click()
  const row = historyRow(page, 'UTC', 'London')
  await expect(row).toBeVisible()
  await expect(row).toContainText('2024-03-10')
  await expect(row).toContainText('12:00')
})

test('[A5] the History tab shows a "Source" column header and the saved UTC -> London row', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  await page.getByRole('button', { name: 'Save conversion' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('columnheader', { name: 'Source' })).toBeVisible()
  const row = historyRow(page, 'UTC', 'London')
  await expect(row).toBeVisible()
  await expect(row).toContainText('2024-03-10')
  await expect(row).toContainText('12:00')
})

test('[A6] clicking "Copy result" copies 12:00 to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  await page.getByRole('button', { name: 'Copy result' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('12:00')
})

test('[A7] UTC -> Sydney on 2024-01-15 00:00 shows 10:00', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'UTC', 'Sydney', '2024-01-15', '00:00')
  await expect(page.getByLabel('Result time')).toHaveValue('10:00')
})

// A8 names "New York" and "UTC" as the source/target after the swap; we read the
// select's option label (not its internal value) so the assertion does not depend
// on the IANA identifier the app may store.
test('[A8] clicking "Swap" exchanges the source and target timezones', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'UTC', 'New York', '2024-01-15', '14:30')
  await page.getByRole('button', { name: 'Swap' }).click()
  await expect(page.getByLabel('Source timezone')).toHaveValue({ label: 'New York' })
  await expect(page.getByLabel('Target timezone')).toHaveValue({ label: 'UTC' })
})

test('[A9] a saved conversion survives a reload and still shows in the History tab', async ({ page }) => {
  await page.goto('/')
  await enterConversion(page, 'UTC', 'London', '2024-03-10', '12:00')
  await page.getByRole('button', { name: 'Save conversion' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  const row = historyRow(page, 'UTC', 'London')
  await expect(row).toBeVisible()
  await expect(row).toContainText('2024-03-10')
  await expect(row).toContainText('12:00')
})
