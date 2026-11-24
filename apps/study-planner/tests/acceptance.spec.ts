import { expect, test, type Page } from '@playwright/test'

// Creates the "Math" session used across the acceptance checks.
async function addMath(page: Page) {
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('Math')
  await page.getByLabel('Date').fill('2024-05-15')
  await page.getByLabel('Start time').fill('14:00')
  await page.getByLabel('Duration').fill('60')
  await page.getByRole('button', { name: 'Save' }).click()
}

// Creates the "History" recurring session used across the acceptance checks.
async function addHistory(page: Page) {
  await page.getByRole('button', { name: 'New session' }).click()
  await page.getByLabel('Subject').fill('History')
  await page.getByLabel('Date').fill('2024-05-16')
  await page.getByLabel('Start time').fill('10:00')
  await page.getByLabel('Duration').fill('90')
  await page.getByLabel('Repeat weekly').check()
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and both tabs are visible, Month active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Study Planner' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Month' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Week' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Month' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] saving a new session shows "Math 14:00-15:00" on May 15, 2024 in the month grid', async ({ page }) => {
  await page.goto('/')
  await addMath(page)
  const cell = page.getByRole('cell', { name: 'May 15' })
  await expect(cell).toBeVisible()
  await expect(cell).toContainText('Math 14:00-15:00')
})

test('[A3] clicking the session opens detail and Mark done changes status to Done with a checkmark', async ({ page }) => {
  await page.goto('/')
  await addMath(page)
  await page.getByText('Math 14:00-15:00').first().click()
  await expect(page.getByRole('button', { name: 'Mark done' })).toBeVisible()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.getByText('Done')).toBeVisible()
  await expect(page.locator('svg').first()).toBeVisible()
})

test('[A4] Delete in the detail view removes the session from the calendar', async ({ page }) => {
  await page.goto('/')
  await addMath(page)
  await page.getByText('Math 14:00-15:00').first().click()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('cell', { name: 'May 15' })).not.toContainText('Math 14:00-15:00')
})

test('[A5] Week tab shows the session in the May 13–May 19 column', async ({ page }) => {
  await page.goto('/')
  await addMath(page)
  await page.getByRole('tab', { name: 'Week' }).click()
  await expect(page.getByText('Math 14:00-15:00')).toBeVisible()
})

test('[A6] checking "Repeat weekly" creates a recurring session on May 23, 2024', async ({ page }) => {
  await page.goto('/')
  await addHistory(page)
  await expect(page.getByRole('cell', { name: 'May 16' })).toContainText('History 10:00-11:30')
  await expect(page.getByRole('cell', { name: 'May 23' })).toContainText('History 10:00-11:30')
})

test('[A7] Export ICS copies an ICS string containing BEGIN:VEVENT and SUMMARY:Math', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addMath(page)
  await page.getByRole('button', { name: 'Export ICS' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('BEGIN:VEVENT')
  expect(text).toContain('SUMMARY:Math')
})

test('[A8] progress summary shows "Completed: 1 of 2" after marking one of two done', async ({ page }) => {
  await page.goto('/')
  await addMath(page)
  await addHistory(page)
  await page.getByText('Math 14:00-15:00').first().click()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await expect(page.getByText('Completed: 1 of 2')).toBeVisible()
})

test('[A9] reload keeps the Math session and the progress summary', async ({ page }) => {
  await page.goto('/')
  await addMath(page)
  await addHistory(page)
  await page.getByText('Math 14:00-15:00').first().click()
  await page.getByRole('button', { name: 'Mark done' }).click()
  await page.reload()
  await expect(page.getByRole('cell', { name: 'May 15' })).toContainText('Math 14:00-15:00')
  await expect(page.getByText('Completed: 1 of 2')).toBeVisible()
})
