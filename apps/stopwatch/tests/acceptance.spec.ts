import { expect, test, type Page } from '@playwright/test'

const duration = /\d+:\d{2}\.\d{2}/

const display = (page: Page) => page.getByText(duration)
const lap = (page: Page, n: string) => page.getByRole('listitem').filter({ hasText: `Lap ${n}` })

// Capture the duration string ("M:SS.ss") rendered on a lap's row.
async function lapDuration(page: Page, n: string): Promise<string> {
  const text = await lap(page, n).innerText()
  const m = text.match(duration)
  expect(m, `duration shown for Lap ${n}`).not.toBeNull()
  return m![0]
}

// Wait for the running display to move off 0:00.00, then record it.
async function runUntilAdvancing(page: Page): Promise<string> {
  await expect(display(page)).not.toHaveText('0:00.00')
  return display(page).innerText()
}

// Start the timer and let it run long enough that the display passes 1:50.00.
// A2 pins the threshold to a 2s wall wait, so we satisfy it without a fixed sleep:
// we poll until the display exceeds 1:50.00, which can only happen after ~2s elapsed.
async function runPast150(page: Page) {
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect
    .poll(async () => {
      const t = (await display(page).innerText()).trim()
      const [m, s] = t.split(':')
      return Number(m) * 60 + Number(s)
    })
    .toBeGreaterThan(110)
}

test('[A1] page shows the "Stopwatch App" heading and a "0:00.00" time display', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Stopwatch App' })).toBeVisible()
  await expect(display(page)).toHaveText('0:00.00')
})

test('[A2] "Start" turns into "Stop" and the display counts past 1:50.00 within 2 seconds', async ({ page }) => {
  await page.goto('/')
  await runPast150(page)
  await expect(page.getByRole('button', { name: 'Start' })).toHaveCount(0)
  await expect(display(page)).not.toHaveText('0:00.00')
  await expect(display(page)).not.toHaveText('1:50.00')
})

test('[A3] clicking "Lap" while running adds a "Lap 1" item with a duration', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(page.getByRole('button', { name: 'Lap' })).toBeVisible()
  await page.getByRole('button', { name: 'Lap' }).click()
  await expect(lap(page, '1')).toBeVisible()
  await expect(lap(page, '1')).toContainText('Lap 1')
  expect(await lapDuration(page, '1'), 'Lap 1 duration matches the pattern').toMatch(duration)
})

test('[A4] a second "Lap" adds "Lap 2" and the list now has two items', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Lap' }).click()
  await expect(lap(page, '1')).toBeVisible()
  await page.getByRole('button', { name: 'Lap' }).click()
  await expect(lap(page, '2')).toBeVisible()
  await expect(lap(page, '2')).toContainText('Lap 2')
  expect(await lapDuration(page, '2'), 'Lap 2 has a duration').toMatch(duration)
  expect(await page.getByRole('listitem').count(), 'exactly two lap items').toBe(2)
})

test('[A5] "Stop" turns into "Start" and the display stops incrementing', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  const running = await runUntilAdvancing(page)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Stop' })).toHaveCount(0)
  // A5: the displayed time remains constant for 2 seconds after stopping.
  // The display is now static (stopped), so pin it to the value it reached; polling
  // for 2s proves it no longer increments.
  const stopped = await display(page).innerText()
  expect(stopped, 'time advanced while running').not.toBe('0:00.00')
  expect(stopped, 'display reflects the running total').toBe(running)
  await expect(display(page)).toHaveText(stopped)
  await page.waitForTimeout(2000)
  await expect(display(page)).toHaveText(stopped)
})

test('[A6] "Reset" clears the display to 0:00.00 and shows "No laps yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Lap' }).click()
  await expect(lap(page, '1')).toBeVisible()
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(display(page)).toHaveText('0:00.00')
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No laps yet')).toBeVisible()
})

test('[A7] two laps and their durations survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Lap' }).click()
  const first = await lapDuration(page, '1')
  await page.getByRole('button', { name: 'Lap' }).click()
  const second = await lapDuration(page, '2')
  await page.reload()
  await expect(lap(page, '1')).toBeVisible()
  await expect(lap(page, '2')).toBeVisible()
  expect(await lapDuration(page, '1'), 'Lap 1 duration persisted').toBe(first)
  expect(await lapDuration(page, '2'), 'Lap 2 duration persisted').toBe(second)
})

test('[A8] "Copy laps" copies the laps and their durations to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Lap' }).click()
  const first = await lapDuration(page, '1')
  await page.getByRole('button', { name: 'Lap' }).click()
  const second = await lapDuration(page, '2')
  // grant before the copy click so the clipboard write can succeed; read after the user action.
  await page.getByRole('button', { name: 'Copy laps' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard contains Lap 1').toContain('Lap 1')
  expect(text, 'clipboard contains Lap 2').toContain('Lap 2')
  expect(text, 'clipboard contains the first duration').toContain(first)
  expect(text, 'clipboard contains the second duration').toContain(second)
})

test('[A9] a lap and its duration survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.getByRole('button', { name: 'Lap' }).click()
  const first = await lapDuration(page, '1')
  await page.reload()
  await expect(lap(page, '1')).toBeVisible()
  await expect(lap(page, '1')).toContainText('Lap 1')
  expect(await lapDuration(page, '1'), 'Lap 1 duration persisted').toBe(first)
})
