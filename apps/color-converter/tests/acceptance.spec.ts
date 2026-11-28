import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Color Format Studio and converts RGB to HEX, HSL, CMYK, OKLCH', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Color Format Studio' })).toBeVisible()
  await expect(page.getByText('rgb(34, 87, 166)')).toBeVisible()
  await expect(page.getByText(/oklch\(/)).toBeVisible()
  await expect(page.getByText(/cmyk\(/)).toBeVisible()
})

test('[A2] Saves swatch to palette, exports CSS tokens, and persists across reload', async ({ page }) => {
  await page.getByLabel('Palette token name').fill('brand-primary')
  await page.getByRole('button', { name: 'Save to palette' }).click()
  await expect(page.getByText('brand-primary')).toBeVisible()

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSS tokens' }).click()
  expect((await dl).suggestedFilename()).toBe('palette.css')

  await page.reload()
  await expect(page.getByText('brand-primary')).toBeVisible()
})
