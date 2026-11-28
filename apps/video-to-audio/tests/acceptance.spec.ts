import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Audio Extractor, extracts demo clip, downloads WAV, and persists history', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Audio Extractor' })).toBeVisible()
  await page.getByRole('button', { name: 'Extract demo clip' }).first().click()
  await expect(page.getByText('interview-clip.wav → interview-clip.wav')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download interview-clip.wav' }).click()
  expect((await dl).suggestedFilename()).toBe('interview-clip.wav')

  await page.reload()
  await expect(page.getByText('interview-clip.wav → interview-clip.wav')).toBeVisible()
})
