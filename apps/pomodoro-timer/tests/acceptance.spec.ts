import { expect, test, type Page } from '@playwright/test'

const time = (page: Page) => page.getByTestId('time')

test('[A1] initial view shows heading, phase and time', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pomodoro Timer' })).toBeVisible()
  await expect(page.getByText('Focus')).toBeVisible()
  await expect(time(page)).toHaveText('25:00')
})

test('[A2] Start begins the Focus countdown and becomes Pause', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByText('Focus')).toBeVisible()
  await expect(time(page)).toHaveText('24:59', { timeout: 5000 })
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('[A3] Pause freezes the countdown and Resume continues from the frozen value', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 5000 })
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(time(page)).toHaveText('24:59')
  const t0 = (await time(page).textContent())!
  await expect(time(page)).toHaveText(t0)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(time(page), 'countdown resumes from the frozen value').not.toHaveText(t0)
})

test('[A4] Skip during a running Focus phase moves to Break at 05:00', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('24:59', { timeout: 5000 })
  await page.getByRole('button', { name: 'Skip' }).click()
  await expect(page.getByText('Break')).toBeVisible()
  await expect(time(page)).toHaveText('05:00')
})

test('[A5] a naturally completed focus switches to Break and toasts', async ({ page }) => {
  await page.goto('/?focus=2')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('00:00', { timeout: 10000 })
  await expect(page.getByText('Break')).toBeVisible()
  await expect(time(page)).toHaveText('05:00')
  await expect(page.getByText('Focus session completed')).toBeVisible()
})

test('[A6] History lists the completed focus session with its duration', async ({ page }) => {
  await page.goto('/?focus=2')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('00:00', { timeout: 10000 })
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('Focus')).toBeVisible()
  await expect(page.getByText('00:02')).toBeVisible()
})

test('[A7] Copy summary copies the session stats and toasts', async ({ page }) => {
  await page.goto('/?focus=2')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('00:00', { timeout: 10000 })
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Copy summary' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  const clip = await page.evaluate(async () => navigator.clipboard.readText())
  expect(clip).toBe('Sessions: 1, Total focus: 00:02')
})

test('[A8] streak is 0 initially and 1 after one natural focus session', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Streak: 0')).toBeVisible()
  await page.goto('/?focus=2')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('00:00', { timeout: 10000 })
  await expect(page.getByText('Streak: 1')).toBeVisible()
})

test('[A9] history and streak survive a reload', async ({ page }) => {
  await page.goto('/?focus=2')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(time(page)).toHaveText('00:00', { timeout: 10000 })
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('Focus')).toBeVisible()
  await expect(page.getByText('00:02')).toBeVisible()
  await expect(page.getByText('Streak: 1')).toBeVisible()
})
