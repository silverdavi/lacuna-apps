import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders heading and empty history state', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Image Converter' })).toBeVisible()
  await expect(page.getByText('No images converted yet')).toBeVisible()
})

test('[A2] Loads sample image, converts to QOI and WebP, and persists history', async ({ page }) => {
  await page.getByRole('button', { name: 'Load sample image' }).first().click()
  await expect(page.getByText('sample-poster.png')).toBeVisible()

  await page.getByLabel('Output format').selectOption('qoi')
  await page.getByRole('button', { name: 'Convert images' }).click()
  await expect(page.getByText('sample-poster.png → sample-poster.qoi')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download', exact: true }).click()
  expect((await dl).suggestedFilename()).toBe('sample-poster.qoi')

  await page.reload()
  await expect(page.getByText('sample-poster.png → sample-poster.qoi')).toBeVisible()
})

test('[A3] Batch ZIP download produces converted-images.zip', async ({ page }) => {
  await page.getByRole('button', { name: 'Load sample image' }).first().click()
  await page.getByLabel('Output format').selectOption('bmp')
  await page.getByRole('button', { name: 'Convert images' }).click()

  const zipDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download all (.zip)' }).click()
  expect((await zipDl).suggestedFilename()).toBe('converted-images.zip')
})
