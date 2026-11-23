import { expect, test, type Page } from '@playwright/test'

const T0 = new Date('2026-01-01T09:00:00')

const display = (page: Page, text: string) => page.getByText(text, { exact: true })

async function startWith(page: Page, duration: string) {
  // Install a fake clock before load so the timer's start timestamp is T0
  // (deterministic remaining-time assertions, no real waiting).
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await page.getByLabel('Duration').fill(duration)
  await page.getByRole('button', { name: 'Start' }).click()
}

test('[A1] on load the heading "Countdown Timer" and "No timer set" are shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Countdown Timer' })).toBeVisible()
  await expect(page.getByText('No timer set')).toBeVisible()
})

test('[A2] starting with Duration "1h 20m" shows "1:20:00" with the Pause and Reset buttons', async ({ page }) => {
  await startWith(page, '1h 20m')
  await expect(display(page, '1:20:00')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
})

test('[A3] pausing a running timer shows Resume instead of Pause', async ({ page }) => {
  await startWith(page, '0m 10s')
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0)
})

test('[A4] resuming a paused timer changes the button label back to Pause', async ({ page }) => {
  await startWith(page, '0m 10s')
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveCount(0)
})

test('[A5] a 5 second timer that reaches zero shows "Time\'s up" and "0:00:00"', async ({ page }) => {
  await startWith(page, '0m 5s')
  await page.clock.fastForward(5000)
  await expect(page.getByText("Time's up")).toBeVisible()
  await expect(display(page, '0:00:00')).toBeVisible()
})

test('[A6] clicking Lap after 10 seconds adds a list item with "Lap 1" and "0:00:10"', async ({ page }) => {
  await startWith(page, '0m 30s')
  await page.clock.fastForward(10000)
  await page.getByRole('button', { name: 'Lap' }).click()
  const lap1 = page.getByRole('listitem').filter({ hasText: 'Lap 1' })
  await expect(lap1).toBeVisible()
  await expect(lap1).toContainText('0:00:10')
})

test('[A7] "Delete Lap 1" removes the first lap leaving only "Lap 2"', async ({ page }) => {
  await startWith(page, '0m 30s')
  await page.clock.fastForward(10000)
  await page.getByRole('button', { name: 'Lap' }).click()
  await page.clock.fastForward(10000)
  await page.getByRole('button', { name: 'Lap' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Lap 1' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Lap 2' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Lap 1' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Lap 1' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Lap 2' })).toBeVisible()
})

test('[A8] starting with Preset "5m" sets the display to "0:05:00"', async ({ page }) => {
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await page.getByLabel('Preset').selectOption('5m')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(display(page, '0:05:00')).toBeVisible()
})

test('[A9] reload keeps a paused timer at "0:59:30" with the Resume button', async ({ page }) => {
  await startWith(page, '1h 0m')
  await page.clock.fastForward(30000)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(display(page, '0:59:30')).toBeVisible()
  await page.reload()
  await expect(display(page, '0:59:30')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
})
