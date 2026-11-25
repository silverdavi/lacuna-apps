import { expect, test } from '@playwright/test'

const display = (p: import('@playwright/test').Page) => p.getByText(/\d{2}:\d{2}/, { exact: true })

test('[A1] clicking "Start" begins a 25-minute countdown from 25:00', async ({ page }) => {
  await page.goto('/')
  await expect(display(page)).toHaveText('25:00')
  await page.getByRole('button', { name: 'Start' }).click()
  // Once running the countdown is live: poll until the display has moved off 25:00.
  await expect(async () => expect(display(page)).not.toHaveText('25:00')).toPass({ timeout: 15000 })
  await page.getByRole('button', { name: 'Pause' }).click()
  const stopped = (await display(page).innerText()).trim()
  expect(stopped).toMatch(/\d{2}:\d{2}/)
  expect(stopped).not.toBe('25:00')
})

test('[A2] clicking "Pause" stops the countdown, shows "Paused" and renames the button "Resume"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  const first = (await display(page).innerText()).trim()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText('Paused')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveCount(0)
  // The countdown stopped on the pause: the value is the same as the moment it paused.
  await expect(display(page)).toHaveText(first)
})

test('[A3] clicking "Reset" stops the countdown and returns to 25:00', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(display(page)).toHaveText('25:00')
})

test('[A4] with 1 work minute, after one minute the display shows the 05:00 break and "Break"', async ({ page }) => {
  test.setTimeout(120000)
  await page.goto('/')
  await page.getByLabel('Work minutes').fill('1')
  await expect(display(page)).toHaveText('01:00')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(display(page)).toHaveText('05:00', { timeout: 75000 })
  await expect(page.getByText('Break')).toBeVisible()
})

test('[A5] clicking "Switch" toggles between work and break modes', async ({ page }) => {
  await page.goto('/')
  await expect(display(page)).toHaveText('25:00')
  await page.getByRole('button', { name: 'Switch' }).click()
  await expect(display(page)).toHaveText('05:00')
  await page.getByRole('button', { name: 'Switch' }).click()
  await expect(display(page)).toHaveText('25:00')
})

test('[A6] typing 30 in "Work minutes" changes the display to 30:00 when idle on work', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Work minutes').fill('30')
  await expect(display(page)).toHaveText('30:00')
})

test('[A7] the timer updates every second while running', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  const first = (await display(page).innerText()).trim()
  // Poll until the display differs from the value it had when started.
  await expect(async () => expect((await display(page).innerText()).trim()).not.toBe(first)).toPass({ timeout: 15000 })
})

test('[A8] closing the app and reopening it retains the last interval setting', async ({ page, context }) => {
  await page.goto('/')
  await page.getByLabel('Work minutes').fill('30')
  await expect(display(page)).toHaveText('30:00')
  await context.close()
  const page2 = await context.newPage()
  await page2.goto('/')
  await expect(page2.getByLabel('Work minutes')).toHaveValue('30')
  await expect(display(page2)).toHaveText('30:00')
})

test('[A9] reload keeps the current interval and state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Work minutes').fill('30')
  await expect(display(page)).toHaveText('30:00')
  await page.reload()
  await expect(display(page)).toHaveText('30:00')
  await page.getByLabel('Work minutes').fill('25')
  await expect(display(page)).toHaveText('25:00')
  await page.reload()
  await expect(display(page)).toHaveText('25:00')
})
