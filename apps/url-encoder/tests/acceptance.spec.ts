import { expect, test } from '@playwright/test'

test('[A1] shows the "URL Encoder" heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'URL Encoder' })).toBeVisible()
})

test('[A2] URL encode of "hello world" shows "hello%20world" in Output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('hello world')
  await page.getByLabel('Codec').selectOption({ label: 'URL encode' })
  await expect(page.getByLabel('Output')).toHaveValue('hello%20world')
})

test('[A3] URL encode of "a/b?c=d&e" shows "a%2Fb%3Fc%3Dd%26e" in Output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('a/b?c=d&e')
  await page.getByLabel('Codec').selectOption({ label: 'URL encode' })
  await expect(page.getByLabel('Output')).toHaveValue('a%2Fb%3Fc%3Dd%26e')
})

test('[A4] URL decode of "hello%20world" shows "hello world" in Output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('hello%20world')
  await page.getByLabel('Codec').selectOption({ label: 'URL decode' })
  await expect(page.getByLabel('Output')).toHaveValue('hello world')
})

test('[A5] Base64 of "abc" shows "YWJj" in Output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('abc')
  await page.getByLabel('Codec').selectOption({ label: 'Base64' })
  await expect(page.getByLabel('Output')).toHaveValue('YWJj')
})

test('[A6] Hex of "abc" shows "616263" in Output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('abc')
  await page.getByLabel('Codec').selectOption({ label: 'Hex' })
  await expect(page.getByLabel('Output')).toHaveValue('616263')
})

test('[A7] Copy shows a toast with "Copied to clipboard"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Input').fill('hello world')
  await page.getByLabel('Codec').selectOption({ label: 'URL encode' })
  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('[A8] Add to history adds a row containing the input and result; Remove deletes it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('hello world')
  await page.getByLabel('Codec').selectOption({ label: 'URL encode' })
  await page.getByRole('button', { name: 'Add to history' }).click()
  const row = page
    .getByRole('table', { name: 'History' })
    .getByRole('row')
    .filter({ hasText: 'hello%20world' })
  await expect(row).toContainText('hello world')
  await row.getByRole('button', { name: 'Remove' }).click()
  await expect(row).toHaveCount(0)
})

test('[A9] a reload keeps the history row with the input and result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input').fill('hello world')
  await page.getByLabel('Codec').selectOption({ label: 'URL encode' })
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.reload()
  const row = page
    .getByRole('table', { name: 'History' })
    .getByRole('row')
    .filter({ hasText: 'hello%20world' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('hello world')
})
