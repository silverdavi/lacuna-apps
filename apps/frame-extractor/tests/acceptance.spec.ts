import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Video Frame Grabber and samples demo video into contact sheet and ZIP', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Video Frame Grabber' })).toBeVisible()
  await page.getByRole('button', { name: 'Sample demo video' }).first().click()
  await expect(page.getByAltText('Video contact sheet')).toBeVisible()
  await expect(page.getByText('frame-01.png')).toBeVisible()

  const sheetDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download contact sheet' }).click()
  expect((await sheetDl).suggestedFilename()).toBe('contact-sheet.png')

  const zipDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download frames.zip' }).click()
  expect((await zipDl).suggestedFilename()).toBe('frames.zip')
})
