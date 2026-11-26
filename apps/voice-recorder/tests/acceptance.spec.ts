import { expect, test, type Page } from '@playwright/test'

// Record a clip: start, wait until the timer has advanced past 00:00, stop.
async function recordClip(page: Page) {
  await page.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.getByText('00:00')).toBeVisible()
  // Poll until the elapsed timer moves past 00:00, i.e. at least one second was recorded.
  await expect
    .poll(async () => (await page.getByText(/\d{2}:\d{2}/).first().innerText()).trim())
    .not.toBe('00:00')
  await page.getByRole('button', { name: 'Stop' }).click()
}

// Capture the duration string ("00:0X") rendered for a given clip's row.
async function durationOf(page: Page, clip: string): Promise<string> {
  const row = page.getByRole('listitem').filter({ hasText: clip })
  const text = await row.innerText()
  const match = text.match(/\d{2}:\d{2}/)
  expect(match, `duration shown for ${clip}`).not.toBeNull()
  return match![0]
}

test('[A1] page heading is "Voice Recorder" and "No clips yet" is visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Voice Recorder' })).toBeVisible()
  await expect(page.getByText('No clips yet')).toBeVisible()
})

test('[A2] Record turns the button into "Stop" and the timer starts at 00:00', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Record' }).click()
  await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Record' })).toHaveCount(0)
  await expect(page.getByText('00:00')).toBeVisible()
})

test('[A3] Stop yields "Clip 1" with a duration and hides "No clips yet"', async ({ page }) => {
  await page.goto('/')
  await recordClip(page)
  await expect(page.getByText('No clips yet')).toHaveCount(0)
  const item = page.getByRole('listitem', { name: /Clip 1/ })
  await expect(item).toBeVisible()
  await expect(item).toContainText('Clip 1')
  const duration = await durationOf(page, 'Clip 1')
  // X is the seconds recorded: at least one second, so 00:01 or higher.
  expect(duration, 'duration matches 00:0X for at least 1 second').toMatch(/^00:0[1-9]$/)
})

test('[A4] Download on "Clip 1" downloads "Clip 1.wav"', async ({ page }) => {
  await page.goto('/')
  await recordClip(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('listitem', { name: /Clip 1/ }).getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('Clip 1.wav')
})

test('[A5] Delete removes "Clip 1" and "No clips yet" reappears', async ({ page }) => {
  await page.goto('/')
  await recordClip(page)
  await expect(page.getByRole('listitem', { name: /Clip 1/ })).toBeVisible()
  await page.getByRole('listitem', { name: /Clip 1/ }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('listitem', { name: /Clip 1/ })).toHaveCount(0)
  await expect(page.getByText('No clips yet')).toBeVisible()
})

test('[A6] a second clip adds "Clip 2" and the list shows both', async ({ page }) => {
  await page.goto('/')
  await recordClip(page)
  await recordClip(page)
  await expect(page.getByRole('listitem', { name: /Clip 1/ })).toBeVisible()
  const second = page.getByRole('listitem', { name: /Clip 2/ })
  await expect(second).toBeVisible()
  await expect(second).toContainText('Clip 2')
  expect(await durationOf(page, 'Clip 1'), 'Clip 1 has a duration').toMatch(/^\d{2}:\d{2}$/)
  expect(await durationOf(page, 'Clip 2'), 'Clip 2 has a duration').toMatch(/^\d{2}:\d{2}$/)
})

// A7 names the fresh-profile clip "Clip 3", which only reconciles with a single
// continuous clip sequence (the Signature) and A3/A4; its first clip is thus "Clip 3".
test('[A7] MP3 format records a clip that downloads as "Clip 3.mp3"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Settings' }).click()
  const format = page.getByLabel('Format')
  await expect(format).toBeVisible()
  const options = await format.locator('option').allInnerTexts()
  expect(options, 'Format offers WAV and MP3').toEqual(expect.arrayContaining(['WAV', 'MP3']))
  await format.selectOption('MP3')
  await recordClip(page)
  const item = page.getByRole('listitem', { name: /Clip 3/ })
  await expect(item).toBeVisible()
  expect(await durationOf(page, 'Clip 3'), 'Clip 3 has a duration').toMatch(/^\d{2}:\d{2}$/)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    item.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('Clip 3.mp3')
})

test('[A8] clips and durations survive a reload', async ({ page }) => {
  await page.goto('/')
  await recordClip(page)
  await recordClip(page)
  const first = await durationOf(page, 'Clip 1')
  const second = await durationOf(page, 'Clip 2')
  await page.reload()
  await expect(page.getByRole('listitem', { name: /Clip 1/ })).toBeVisible()
  await expect(page.getByRole('listitem', { name: /Clip 2/ })).toBeVisible()
  expect(await durationOf(page, 'Clip 1'), 'Clip 1 duration persisted').toBe(first)
  expect(await durationOf(page, 'Clip 2'), 'Clip 2 duration persisted').toBe(second)
})
