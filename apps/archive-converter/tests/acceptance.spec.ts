import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders heading and empty archive history', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Archive Studio' })).toBeVisible()
  await expect(page.getByText('No archives built yet')).toBeVisible()
})

test('[A2] Loads sample bundle, previews README.md, builds TAR.GZ and downloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Load sample bundle' }).first().click()
  await expect(page.getByText('README.md').first()).toBeVisible()
  await expect(page.getByText('Packed offline with Lacuna Archive Studio.')).toBeVisible()

  await page.getByLabel('Archive name').fill('release-v1')
  await page.getByLabel('Target format').selectOption('tar.gz')
  await page.getByRole('button', { name: 'Build archive' }).click()
  await expect(page.getByText('Ready: release-v1.tar.gz')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download archive' }).click()
  expect((await dl).suggestedFilename()).toBe('release-v1.tar.gz')

  await page.reload()
  await expect(page.getByText('release-v1.tar.gz')).toBeVisible()
})
