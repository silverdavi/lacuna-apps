import { expect, test, type Page } from '@playwright/test'

// The spec fixes the wait at 1000ms for testing, so tests wait on that fixed delay, not a real one.
const WAIT_MS = 1000
const CLICK_AFTER_GREEN_MS = 250

// The spec gives the main display no role name of its own, so it is found by its state text.
async function startTrial(page: Page) {
  await page.getByRole('button', { name: 'Start trial' }).click()
  await expect(page.getByText('Wait for green...')).toBeVisible()
  await expect(page.getByText('Click now!')).toBeVisible({ timeout: WAIT_MS + 500 })
}

// Records one 250 ms trial and returns the app to the ready state.
async function recordTrial(page: Page) {
  await startTrial(page)
  await page.waitForTimeout(CLICK_AFTER_GREEN_MS)
  await page.getByText('Click now!').click()
  await expect(page.getByText('250 ms')).toBeVisible()
}

test('[A1] empty app shows the heading, Start trial button and "Ready to start"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Reaction Time Test' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeEnabled()
  await expect(page.getByText('Ready to start')).toBeVisible()
})

test('[A2] starting a trial shows "Wait for green..." and disables the Start trial button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start trial' }).click()
  await expect(page.getByText('Wait for green...')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeDisabled()
})

test('[A3] the wait phase ends in "Click now!" with the Start trial button still disabled', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start trial' }).click()
  await expect(page.getByText('Click now!')).toBeVisible({ timeout: WAIT_MS + 500 })
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeDisabled()
})

test('[A4] clicking 250 ms after green records 250 ms and adds a History row', async ({ page }) => {
  await page.goto('/')
  await recordTrial(page)
  await expect(page.getByText('250 ms')).toBeVisible()
  const history = page.getByRole('table', { name: 'History' })
  await expect(history).toBeVisible()
  await expect(history.getByRole('row', { name: /250/ })).toBeVisible()
})

test('[A5] after a recorded trial the Start trial button is enabled and the display reads "Ready to start"', async ({ page }) => {
  await page.goto('/')
  await recordTrial(page)
  await expect(page.getByRole('button', { name: 'Start trial' })).toBeEnabled()
  await expect(page.getByText('Ready to start')).toBeVisible()
})

test('[A6] the Stats tab shows an All results table with Time (ms) and Date columns and the 250 row', async ({ page }) => {
  await page.goto('/')
  await recordTrial(page)
  await page.getByRole('tab', { name: 'Stats' }).click()
  const table = page.getByRole('table', { name: 'All results' })
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Time (ms)' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Date' })).toBeVisible()
  await expect(table.getByRole('row', { name: /250/ })).toBeVisible()
})

test('[A7] Copy best copies "Best: 250 ms" and shows the toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await recordTrial(page)
  await page.getByRole('tab', { name: 'Stats' }).click()
  await page.getByRole('button', { name: 'Copy best' }).click()
  await expect(page.getByText('Copied to clipboard', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Best: 250 ms')
})

test('[A8] Clear history removes all rows and shows "No results yet"', async ({ page }) => {
  await page.goto('/')
  await recordTrial(page)
  await page.getByRole('tab', { name: 'Stats' }).click()
  await expect(page.getByRole('table', { name: 'All results' }).getByRole('row', { name: /250/ })).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No results yet')).toBeVisible()
  const table = page.getByRole('table', { name: 'All results' })
  await expect(table.getByRole('row')).toHaveCount(0)
})

test('[A9] a recorded trial survives a reload in the Stats tab', async ({ page }) => {
  await page.goto('/')
  await recordTrial(page)
  await page.reload()
  await page.getByRole('tab', { name: 'Stats' }).click()
  const table = page.getByRole('table', { name: 'All results' })
  await expect(table.getByRole('row', { name: /250/ })).toBeVisible()
})
