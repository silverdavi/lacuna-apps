import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Audio Converter and empty history', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Audio Converter' })).toBeVisible()
  await expect(page.getByText('No audio converted yet')).toBeVisible()
})

test('[A2] Generates sample chord, resamples to 16 kHz mono WAV, downloads, and persists history', async ({ page }) => {
  await page.getByRole('button', { name: 'Generate sample chord' }).first().click()
  await expect(page.getByText('sample-chord.wav').first()).toBeVisible()

  await page.getByLabel('Sample rate').selectOption('16000')
  await page.getByLabel('Channels').selectOption('1')
  await page.getByRole('button', { name: 'Convert audio' }).click()
  await expect(page.getByText('sample-chord.wav → sample-chord-16k.wav')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download sample-chord-16k.wav' }).click()
  expect((await dl).suggestedFilename()).toBe('sample-chord-16k.wav')

  await page.reload()
  await expect(page.getByText('sample-chord.wav → sample-chord-16k.wav')).toBeVisible()
})
