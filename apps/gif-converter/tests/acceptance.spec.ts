import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders GIF Studio and empty sequence state', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'GIF Studio' })).toBeVisible()
  await expect(page.getByText('No frames loaded')).toBeVisible()
})

test('[A2] Generates demo frames, encodes valid GIF89a, previews, and downloads', async ({ page }) => {
  await page.getByRole('button', { name: 'Generate demo frames' }).first().click()
  await expect(page.getByText('frame-01.png')).toBeVisible()
  await expect(page.getByText('frame-06.png')).toBeVisible()

  await page.getByRole('button', { name: 'Encode GIF' }).click()
  await expect(page.getByAltText('Animated GIF preview')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download animation.gif' }).click()
  expect((await dl).suggestedFilename()).toBe('animation.gif')
})
