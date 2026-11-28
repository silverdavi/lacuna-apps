import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Subtitle Converter and converts starter SRT to WebVTT with stripped tags', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Subtitle Converter' })).toBeVisible()
  await expect(page.getByLabel('Converted subtitles')).toHaveValue(/^WEBVTT/)
  await expect(page.getByLabel('Converted subtitles')).not.toHaveValue(/<i>/)
})

test('[A2] Shifts timing by +1000ms, converts to ASS, downloads, and persists shift', async ({ page }) => {
  await page.getByLabel('Time shift (ms)').fill('1000')
  await expect(page.getByLabel('Converted subtitles')).toHaveValue(/00:00:02\.000 --> 00:00:04\.800/)

  await page.getByLabel('Target format').selectOption('ass')
  await expect(page.getByLabel('Converted subtitles')).toHaveValue(/Dialogue: 0,0:00:02\.00/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .ass' }).click()
  expect((await dl).suggestedFilename()).toBe('subtitles.ass')

  await page.reload()
  await expect(page.getByLabel('Time shift (ms)')).toHaveValue('1000')
})
