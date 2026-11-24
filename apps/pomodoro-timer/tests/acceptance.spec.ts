import { expect, test, type Page } from '@playwright/test'

const time = (page: Page) => page.getByText(/\d{2}:\d{2}/).first()

// Natural completion only happens when the interval length is short enough; the spec fixes Focus at 25:00,
// so a long interval cannot be completed inside the test timeout.
const focusSeconds = async (page: Page) => {
  await page.goto('/')
  const seconds = Number((await time(page).innerText()).split(':')[1])
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).not.toHaveText(/\d{2}:\d{2}/, { timeout: 2000 }) // guard against a static display
  await page.getByRole('button', { name: 'Pause' }).click()
  return seconds
}

test('[A1] page shows the heading "Pomodoro Timer", the text "Focus", and the time display "25:00"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pomodoro Timer' })).toBeVisible()
  await expect(page.getByText('Focus')).toBeVisible()
  await expect(page.getByText('25:00')).toBeVisible()
})

test('[A2] clicking "Start" changes the phase to "Focus", the time to "24:59", and the button to "Pause"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('Focus')).toBeVisible()
  await expect(time(page)).toHaveText('24:59', { timeout: 2000 })
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('[A3] "Pause" freezes the display and "Resume" continues from the frozen value', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:58', { timeout: 2000 })
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  const frozen = (await time(page).innerText()).trim()
  // the display must not tick while paused; this also distinguishes a live value from a static "00:00"
  await expect(time(page)).toHaveText(frozen, { timeout: 3000 })
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(time(page)).not.toHaveText(frozen, { timeout: 2000 })
})

test('[A4] clicking "Skip" during a running Focus phase shows "Break" and "05:00"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 2000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByText('Break')).toBeVisible()
  await expect(time(page)).toHaveText('05:00')
})

test('[A5] a naturally completed Focus phase shows "Break", "05:00" and a "Focus session completed" toast', async ({ page }) => {
  const seconds = await focusSeconds(page)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(time(page)).toHaveText('00:00', { timeout: Math.min(seconds, 120) * 1000 + 5000 })
  await expect(page.getByText('Break')).toBeVisible()
  await expect(time(page)).toHaveText('05:00')
  await expect(page.getByText('Focus session completed')).toBeVisible()
})

test('[A6] the History tab lists a completed Focus session with duration "25:00"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 2000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Focus' })).toContainText('25:00')
})

test('[A7] "Copy summary" copies "Sessions: 1, Total focus: 25:00" and shows a "Copied to clipboard" toast', async ({ page, context }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 2000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy summary' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the summary').toBe('Sessions: 1, Total focus: 25:00')
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('[A8] the streak shows "Streak: 0" initially and "Streak: 1" after a completed Focus session', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Streak: 0')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 2000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByText('Streak: 1')).toBeVisible()
})

test('[A9] reload keeps the completed session in History and the streak at "Streak: 1"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 2000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Focus' })).toContainText('25:00')
  await expect(page.getByText('Streak: 1')).toBeVisible()
})
