import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Data URI Converter and formats Hex and Uint8Array', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Data URI Converter' })).toBeVisible()
  await page.getByLabel('Output representation').selectOption('hex')
  await expect(page.getByLabel('Formatted snippet')).toHaveValue(/^48 65 6c 6c 6f/)

  await page.getByLabel('Output representation').selectOption('uint8')
  await expect(page.getByLabel('Formatted snippet')).toHaveValue(/new Uint8Array\(\[72, 101/)
})

test('[A2] Decodes Data URI back to downloadable file', async ({ page }) => {
  const dl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Decode & download file' }).click()
  expect((await dl).suggestedFilename()).toBe('hello.txt')
})
