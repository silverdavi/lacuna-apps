import { expect, test, type Page } from '@playwright/test'

// The timer display reads "MM:SS".
const time = (page: Page) => page.getByText(/\d{2}:\d{2}/)

// Read the current MM:SS display, trimming whitespace.
async function display(page: Page) {
  return (await time(page).first().innerText()).trim()
}

// The button labelled by the spec's words: Start / Pause / Reset / Switch.
const button = (page: Page, name: string) => page.getByRole('button', { name })

// The work-time field, named from the spec's "work time" wording.
const workTime = (page: Page) => page.getByLabel('Work time')

test('[A1] clicking Start begins a 25-minute countdown', async ({ page }) => {
  await page.goto('/')
  await expect(await display(page)).toBe('25:00')
  await button(page, 'Start').click()
  // The countdown must tick down from 25:00 within its test timeout.
  await expect(async () => {
    expect(await display(page)).not.toBe('25:00')
  }).toPass()
})

test('[A2] clicking Pause stops the countdown and shows Paused on the button', async ({ page }) => {
  await page.goto('/')
  await button(page, 'Start').click()
  await button(page, 'Pause').click()
  await expect(button(page, 'Paused')).toBeVisible()
  await expect(button(page, 'Start')).toHaveCount(0)
  await expect(button(page, 'Pause')).toHaveCount(0)
  const frozen = await display(page)
  await expect(async () => {
    expect(await display(page)).toBe(frozen)
  }).toPass()
})

test('[A3] clicking Reset stops the countdown and returns to 25:00', async ({ page }) => {
  await page.goto('/')
  await button(page, 'Start').click()
  await button(page, 'Reset').click()
  await expect(await display(page)).toBe('25:00')
  await expect(button(page, 'Start')).toBeVisible()
})

test('[A4] after the work interval ends the timer switches to a 5-minute break', async ({ page }) => {
  await page.goto('/')
  // The spec fixes the work interval at 25 minutes, which is too long to run
  // inside a test. Use the work-time field to set a 1-minute work interval, run
  // it down to 00:00, and confirm the app then takes over with the 5-minute break.
  await workTime(page).fill('1')
  await expect(async () => {
    expect(await display(page)).toBe('1:00')
  }).toPass()
  await button(page, 'Start').click()
  await expect(async () => {
    expect(await display(page)).toBe('00:00')
  }).toPass()
  await expect(async () => {
    expect(await display(page)).toBe('5:00')
  }).toPass()
})

test('[A5] clicking Switch toggles between work and break modes', async ({ page }) => {
  await page.goto('/')
  await expect(await display(page)).toBe('25:00')
  await button(page, 'Switch').click()
  await expect(await display(page)).toBe('5:00')
  await button(page, 'Switch').click()
  await expect(await display(page)).toBe('25:00')
})

test('[A6] typing 30 in the work time field changes the interval to 30 minutes', async ({ page }) => {
  await page.goto('/')
  await workTime(page).fill('30')
  await expect(async () => {
    expect(await display(page)).toBe('30:00')
  }).toPass()
})

test('[A7] the timer updates every second while running', async ({ page }) => {
  await page.goto('/')
  await button(page, 'Start').click()
  // A live per-second timer shows a different value one second on, then the
  // next. Poll until the display has changed, then confirm it changed again.
  const start = await display(page)
  const changed = await expect
    .poll(async () => (await display(page)) !== start, { timeout: 30_000 })
    .toBeTruthy()
  expect(changed, 'the display advanced from the initial value').toBe(true)
  const first = await display(page)
  await expect
    .poll(async () => (await display(page)) !== first, { timeout: 30_000 })
    .toBeTruthy()
})

test('[A8] reopening the app retains the last interval setting', async ({ page }) => {
  await page.goto('/')
  await workTime(page).fill('30')
  await expect(async () => {
    expect(await display(page)).toBe('30:00')
  }).toPass()
  // Close the tab and reopen it. The interval setting is kept in the browser,
  // so a fresh visit to the app must come back on 30:00.
  await page.close()
  const reopened = await page.context().newPage()
  await reopened.goto('/')
  await expect(async () => {
    expect(await display(reopened)).toBe('30:00')
  }).toPass()
})

test('[A9] reload keeps the current interval and state', async ({ page }) => {
  await page.goto('/')
  // Work mode, mid-countdown: read the exact remaining value, reload, and the
  // interval (work) plus that remaining value must come back unchanged.
  await button(page, 'Start').click()
  await expect(async () => {
    expect(await display(page)).not.toBe('25:00')
  }).toPass()
  const frozen = await display(page)
  await page.reload()
  await expect(async () => {
    expect(await display(page)).toBe(frozen)
  }).toPass()
  // Break mode: switch to the break and reload; the break interval must be
  // restored (not reset to the work interval's 25:00).
  await button(page, 'Switch').click()
  await page.reload()
  await expect(async () => {
    expect(await display(page)).not.toBe('25:00')
  }).toPass()
  await expect(async () => {
    expect(await display(page)).toBe('5:00')
  }).toPass()
})
