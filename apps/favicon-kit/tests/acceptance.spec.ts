import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Icon Pack Converter and generates multi-size favicon ZIP and ICO', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Icon Pack Converter' })).toBeVisible()
  await page.getByLabel('Monogram (1-2 letters)').fill('AC')
  await page.getByRole('button', { name: 'Generate icon pack' }).click()

  await expect(page.getByAltText('Generated icon preview')).toBeVisible()
  await expect(page.getByText('apple-touch-icon.png', { exact: true })).toBeVisible()
  await expect(page.getByText('site.webmanifest', { exact: true })).toBeVisible()

  const zipDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download favicon-kit.zip' }).click()
  expect((await zipDl).suggestedFilename()).toBe('favicon-kit.zip')

  const icoDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download favicon.ico' }).click()
  expect((await icoDl).suggestedFilename()).toBe('favicon.ico')
})
