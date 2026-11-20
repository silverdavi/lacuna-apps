import { expect, test, type Page } from '@playwright/test'

async function addSecret(page: Page, secret: string) {
  await page.getByLabel('Base32 Secret').fill(secret)
  await page.getByRole('button', { name: 'Add account' }).click()
}

async function addUri(page: Page, uri: string) {
  await page.getByLabel('otpauth URI').fill(uri)
  await page.getByRole('button', { name: 'Add account' }).click()
}

function item(page: Page, text: string) {
  return page.getByRole('listitem').filter({ hasText: text })
}

test('[A1] with no accounts the page shows the heading and "No accounts yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'TOTP Authenticator' })).toBeVisible()
  await expect(page.getByText('No accounts yet')).toBeVisible()
})

test('[A2] adding a base32 secret shows a list item with the secret and a 6-digit code', async ({ page }) => {
  await page.goto('/')
  await addSecret(page, 'JBSWY3DPEHPK3PXP')
  const r = item(page, 'JBSWY3DPEHPK3PXP')
  await expect(r).toContainText(/[0-9]{6}/)
  await expect(page.getByText('No accounts yet')).toHaveCount(0)
})

test('[A3] adding an otpauth URI shows a list item with the account label and a 6-digit code', async ({ page }) => {
  await page.goto('/')
  await addUri(page, 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example')
  const r = item(page, 'Example:alice@example.com')
  await expect(r).toContainText(/[0-9]{6}/)
})

test('[A4] an invalid base32 secret shows "Invalid base32 secret" and adds no list item', async ({ page }) => {
  await page.goto('/')
  await addSecret(page, 'INVALID_SECRET')
  await expect(page.getByText('Invalid base32 secret')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A5] Copy code copies the current 6-digit code and shows "Code copied"', async ({ page, context }) => {
  // the user action that copies must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addUri(page, 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example')
  await page.getByRole('button', { name: 'Copy code' }).click()
  await expect(page.getByText('Code copied')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toMatch(/^[0-9]{6}$/)
})

test('[A6] Delete removes the account and "No accounts yet" reappears when it was the only one', async ({ page }) => {
  await page.goto('/')
  await addUri(page, 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example')
  await page.getByRole('button', { name: 'Delete Example:alice@example.com' }).click()
  await expect(item(page, 'Example:alice@example.com')).toHaveCount(0)
  await expect(page.getByText('No accounts yet')).toBeVisible()
})

test('[A7] adding the same secret twice adds two list items, not one', async ({ page }) => {
  await page.goto('/')
  await addSecret(page, 'JBSWY3DPEHPK3PXP')
  await addSecret(page, 'JBSWY3DPEHPK3PXP')
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('[A8] the Base32 Secret field accepts only uppercase alphanumeric characters', async ({ page }) => {
  await page.goto('/')
  // The spec allows either auto-conversion or rejection; auto-conversion to "ABC" is the common reading.
  await page.getByLabel('Base32 Secret').fill('abc')
  const value = await page.getByLabel('Base32 Secret').inputValue()
  expect(value).toBe('ABC')
})

test('[A9] an account with secret JBSWY3DPEHPK3PXP survives a reload', async ({ page }) => {
  await page.goto('/')
  await addSecret(page, 'JBSWY3DPEHPK3PXP')
  await page.reload()
  const r = item(page, 'JBSWY3DPEHPK3PXP')
  await expect(r).toContainText(/[0-9]{6}/)
})
