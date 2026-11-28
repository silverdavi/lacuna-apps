import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Text Transformer and runs default trim -> dedupe -> kebab pipeline', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Text Transformer' })).toBeVisible()
  await expect(page.getByLabel('Transformed text')).toHaveValue(
    'quarterly-launch-checklist\ndesign-system-review\napi-schema-validation',
  )
})

test('[A2] Adds UPPERCASE step, downloads transformed.txt, and persists across reload', async ({ page }) => {
  await page.getByLabel('Add transform').selectOption('upper')
  await page.getByRole('button', { name: 'Add step' }).click()
  await expect(page.getByLabel('Transformed text')).toHaveValue(/QUARTERLY-LAUNCH-CHECKLIST/)

  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download .txt' }).click()
  expect((await dl).suggestedFilename()).toBe('transformed.txt')

  await page.reload()
  await expect(page.getByLabel('Transformed text')).toHaveValue(/QUARTERLY-LAUNCH-CHECKLIST/)
})
