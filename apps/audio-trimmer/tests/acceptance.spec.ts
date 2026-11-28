import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Audio Cutter and empty waveform state', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Audio Cutter' })).toBeVisible()
  await expect(page.getByText('No waveform loaded')).toBeVisible()
})

test('[A2] Loads sample melody, trims range, renders cut, and downloads WAV', async ({ page }) => {
  await page.getByRole('button', { name: 'Load sample melody' }).first().click()
  await expect(page.getByLabel('Audio waveform preview')).toBeVisible()

  await page.getByLabel('Start (seconds)').fill('0.4')
  await page.getByLabel('End (seconds)').fill('1.6')
  await page.getByRole('button', { name: 'Render cut' }).click()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download sample-melody-trimmed.wav' }).click()
  expect((await dl).suggestedFilename()).toBe('sample-melody-trimmed.wav')
})
