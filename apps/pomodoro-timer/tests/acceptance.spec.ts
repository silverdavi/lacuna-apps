import { expect, test, type Page } from '@playwright/test'

// Complete a running Focus phase to 00:00, advancing the app clock as needed
// so the test stays bounded no matter how the tick interval is scheduled.
async function completeFocus(page: Page) {
  const time = page.getByText('00:00', { exact: true })
  while ((await time.count()) === 0) {
    await page.clock.runFor(60_000)
  }
  await expect(time).toBeVisible()
}

test('[A1] initial page shows heading, Focus and 25:00', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pomodoro Timer' })).toBeVisible()
  await expect(page.getByText('Focus', { exact: true })).toBeVisible()
  await expect(page.getByText('25:00', { exact: true })).toBeVisible()
})

test('[A2] Start changes phase to Focus, shows 24:59 within a second, and the button reads Pause', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.clock.runFor(1000)
  await expect(page.getByText('Focus', { exact: true })).toBeVisible()
  await expect(page.getByText('24:59', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('[A3] Pause freezes the time and Resume continues from the frozen value', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.clock.runFor(3000)
  // Read the value actually displayed at the moment of pause; the frozen
  // value must be exactly this text and resume must continue from it.
  const frozen = await page.getByText(/\d{2}:\d{2}/, { exact: true }).first().innerText()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.clock.runFor(5000)
  await expect(page.getByText(frozen, { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.clock.runFor(2000)
  const [mm, ss] = frozen.split(':').map(Number)
  const resumed = `${String(Math.floor((mm * 60 + ss - 1) / 60)).padStart(2, '0')}:${String((mm * 60 + ss - 1) % 60).padStart(2, '0')}`
  await expect(page.getByText(resumed, { exact: true })).toBeVisible()
})

test('[A4] Skip during a running Focus phase switches to Break and resets to 05:00', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByText('Break', { exact: true })).toBeVisible()
  await expect(page.getByText('05:00', { exact: true })).toBeVisible()
})

test('[A5] natural Focus completion shows Break, 05:00 and the toast Focus session completed', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await completeFocus(page)
  await expect(page.getByText('Break', { exact: true })).toBeVisible()
  await expect(page.getByText('05:00', { exact: true })).toBeVisible()
  await expect(page.getByText('Focus session completed')).toBeVisible()
})

test('[A6] after completing one Focus session the History tab lists Focus with 25:00', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await completeFocus(page)
  await page.getByRole('tab', { name: 'History' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Focus' })
  await expect(item).toContainText('25:00')
})

test('[A7] Copy summary copies "Sessions: 1, Total focus: 25:00" and toasts Copied to clipboard', async ({ page, context }) => {
  // grant before the copy click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await completeFocus(page)
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Copy summary' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Sessions: 1, Total focus: 25:00')
})

test('[A8] streak shows Streak: 0 initially and Streak: 1 after one Focus session', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await expect(page.getByText('Streak: 0')).toBeVisible()
  await page.getByRole('button', { name: 'Start' }).click()
  await completeFocus(page)
  await expect(page.getByText('Streak: 1')).toBeVisible()
})

test('[A9] a completed Focus session and its streak survive a reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await completeFocus(page)
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Focus' })
  await expect(item).toContainText('25:00')
  await expect(page.getByText('Streak: 1')).toBeVisible()
})
