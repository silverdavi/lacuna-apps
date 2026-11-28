import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Font Converter, inspects sample TTF tables, and downloads CSS', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Font Converter' })).toBeVisible()
  await expect(page.getByText('head', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Generated @font-face CSS')).toHaveValue(/@font-face/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download CSS' }).click()
  expect((await dl).suggestedFilename()).toBe('brandsans.css')
})
