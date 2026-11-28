import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders MIDI Converter, exports .mid and .wav, and converts to JSON', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'MIDI Converter' })).toBeVisible()
  await expect(page.getByLabel('Converted notation')).toHaveValue(/K:C/)

  const midDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download melody.mid' }).click()
  expect((await midDl).suggestedFilename()).toBe('melody.mid')

  const wavDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Synthesize WAV' }).click()
  expect((await wavDl).suggestedFilename()).toBe('melody.wav')

  await page.getByLabel('Text representation').selectOption('json')
  await expect(page.getByLabel('Converted notation')).toHaveValue(/"midi": 60/)
})
