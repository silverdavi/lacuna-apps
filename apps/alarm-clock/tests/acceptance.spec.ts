// Acceptance tests for alarm-clock, one per spec check (A1-A9).
// A6 reads the display via page.evaluate: after Pause the app must keep
// displaying the same value, so a two-sample check is how we observe "stops changing".
import { expect, test } from '@playwright/test'

test('[A1] heading and empty list state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Alarm Clock' })).toBeVisible()
  await expect(page.getByText('No alarms yet')).toBeVisible()
})

test('[A2] adding an alarm via the New alarm form', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Time').fill('07:30')
  await page.getByLabel('Label').fill('Morning')
  await page.getByRole('button', { name: 'Add alarm' }).click()
  await expect(page.getByText('07:30')).toBeVisible()
  await expect(page.getByText('Morning')).toBeVisible()
  await expect(page.getByText('No alarms yet')).toHaveCount(0)
})

test('[A3] deleting the alarm restores the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Time').fill('07:30')
  await page.getByLabel('Label').fill('Morning')
  await page.getByRole('button', { name: 'Add alarm' }).click()
  await page.getByRole('button', { name: 'Delete Morning' }).click()
  await expect(page.getByText('07:30')).toHaveCount(0)
  await expect(page.getByText('No alarms yet')).toBeVisible()
})

test('[A4] Timer tab shows Start and a zeroed display', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Timer' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await expect(page.getByText('00:00')).toBeVisible()
})

test('[A5] preset and Start begin the countdown', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Timer' }).click()
  await page.getByRole('button', { name: '5 min' }).click()
  await expect(page.getByText('05:00')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  // Display counts down from 05:00, so a value below 05:00 must appear shortly after.
  await expect
    .poll(async () => /(^|\D)04:5\d($|\D)/.test(await page.locator('body').innerText()), 5_000, 100)
    .toBe(true)
})

test('[A6] Pause freezes the display', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Timer' }).click()
  await page.getByRole('button', { name: '5 min' }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  // Two samples of the display, taken more than 2 seconds apart, must match.
  const display = page.locator('text=/^\\d{2}:\\d{2}$/')
  await expect(display).toBeVisible()
  const a = await display.innerText()
  await page.waitForTimeout(2_500)
  expect(await display.innerText()).toEqual(a)
})

test('[A7] Reset zeroes the display and restores Start', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Timer' }).click()
  await page.getByRole('button', { name: '5 min' }).click()
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(page.getByText('00:00')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
})

test('[A8] adding with an empty time shows the validation message', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add alarm' }).click()
  await expect(page.getByText('Enter a time')).toBeVisible()
  await expect(page.getByText('07:30')).toHaveCount(0)
})

test('[A9] reload keeps the saved alarm', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Time').fill('07:30')
  await page.getByLabel('Label').fill('Morning')
  await page.getByRole('button', { name: 'Add alarm' }).click()
  await page.reload()
  await expect(page.getByText('07:30')).toBeVisible()
  await expect(page.getByText('Morning')).toBeVisible()
})
