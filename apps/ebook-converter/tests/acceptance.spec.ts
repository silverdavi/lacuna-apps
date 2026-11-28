import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders EPUB Converter, detects 3 chapters, and downloads valid .epub', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'EPUB Converter' })).toBeVisible()
  await expect(page.getByText('Chapter 1: Offline Foundations', { exact: true })).toBeVisible()
  await expect(page.getByText('Chapter 3: Portable Reading', { exact: true })).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download field-guide-to-offline-tools.epub' }).click()
  expect((await dl).suggestedFilename()).toBe('field-guide-to-offline-tools.epub')
})

test('[A2] Updates book title and persists across reload', async ({ page }) => {
  await page.getByLabel('Book title').fill('Pocket Almanac')
  await page.reload()
  await expect(page.getByLabel('Book title')).toHaveValue('Pocket Almanac')
})
