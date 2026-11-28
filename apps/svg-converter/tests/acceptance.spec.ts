import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders SVG Converter and optimizes sample SVG', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'SVG Converter' })).toBeVisible()
  await expect(page.getByLabel('Output code')).not.toHaveValue(/<!--/)
  await expect(page.getByLabel('Output code')).not.toHaveValue(/<metadata/)
})

test('[A2] Exports React JSX and rasterizes PNG at 2x', async ({ page }) => {
  await page.getByLabel('Output format').selectOption('jsx')
  await expect(page.getByLabel('Output code')).toHaveValue(/strokeWidth=/)

  await page.getByLabel('Output format').selectOption('png')
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download output' }).click()
  expect((await dl).suggestedFilename()).toBe('graphic-2x.png')
})
