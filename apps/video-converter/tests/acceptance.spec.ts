import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Video Converter and empty history', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Video Converter' })).toBeVisible()
  await expect(page.getByText('No videos converted yet')).toBeVisible()
})

test('[A2] Generates test clip, grabs poster PNG, and transcodes to WebM', async ({ page }) => {
  await page.getByRole('button', { name: 'Generate test clip' }).first().click()
  await expect(page.getByText('sample-clip.webm').first()).toBeVisible({ timeout: 10000 })

  const posterDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Grab poster PNG' }).click()
  expect((await posterDl).suggestedFilename()).toBe('sample-clip-poster.png')

  await page.getByRole('button', { name: 'Convert to WebM' }).click()
  await expect(page.getByRole('button', { name: 'Download WebM' })).toBeEnabled({ timeout: 10000 })

  const webmDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download WebM' }).click()
  expect((await webmDl).suggestedFilename()).toBe('sample-clip.webm')
})
