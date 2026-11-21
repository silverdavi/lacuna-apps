import { test, expect } from '@playwright/test'

test('[A1] initial state shows empty panes and Base64', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('textbox').first()).toHaveValue('')
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('')
  await expect(page.getByLabel('Encoding')).toHaveValue('base64')
})

test('[A2] encode Hello to Base64', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('Hello')
  await page.getByLabel('Encoding').selectOption({ label: 'Base64' })
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('SGVsbG8=')
})

test('[A3] decode Base64 to Hello', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('SGVsbG8=')
  await page.getByLabel('Encoding').selectOption({ label: 'Base64' })
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('Hello')
})

test('[A4] encode Hello to Hex', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('Hello')
  await page.getByLabel('Encoding').selectOption({ label: 'Hex' })
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('48656c6c6f')
})

test('[A5] decode Hex to Hello', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('48656c6c6f')
  await page.getByLabel('Encoding').selectOption({ label: 'Hex' })
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('Hello')
})

test('[A6] encode Hello World to URL-safe Base64', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('Hello World')
  await page.getByLabel('Encoding').selectOption({ label: 'URL-safe Base64' })
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('SGVsbG8gV29ybGQ=')
})

test('[A7] copy output shows Copied tooltip and clipboard value', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('textbox').first().fill('Hello')
  await page.getByLabel('Encoding').selectOption({ label: 'Base64' })
  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  const clipboard = await context.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('SGVsbG8=')
})

test('[A8] swap moves encoded value to input and original to output', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('Test')
  await page.getByLabel('Encoding').selectOption({ label: 'Base64' })
  await page.getByRole('button', { name: 'Swap' }).click()
  await expect(page.getByRole('textbox').first()).toHaveValue('VGVzdA==')
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('Test')
  await expect(page.getByLabel('Encoding')).toHaveValue('base64')
})

test('[A9] reload preserves last conversion', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('Persist')
  await page.getByLabel('Encoding').selectOption({ label: 'Base64' })
  await page.reload()
  await expect(page.getByRole('textbox').first()).toHaveValue('Persist')
  await expect(page.getByRole('textbox').nth(1)).toHaveValue('UGVyc2lzdA==')
})
