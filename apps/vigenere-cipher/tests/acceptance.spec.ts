// Acceptance tests for the vigenere-cipher app.
// Derived from the spec's acceptance checks A1-A9; expected values copied verbatim.
import { expect, test } from '@playwright/test'

test('[A1] heading "Vigenere Cipher" is shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vigenere Cipher' })).toBeVisible()
})

test('[A2] encoding HELLO with key KEY shows RIJVS in Result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('HELLO')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Encode' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
})

test('[A3] decoding RIJVS with key KEY shows HELLO in Result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('RIJVS')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Decode' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('HELLO')
})

test('[A4] encoding lowercase hello with key key keeps case and shows rijvs', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('hello')
  await page.getByLabel('Key').fill('key')
  await page.getByRole('radio', { name: 'Encode' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('rijvs')
})

test('[A5] spaces do not advance the key: encoding HELLO WORLD shows RIJVS UYVJN', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('HELLO WORLD')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Encode' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS UYVJN')
})

test('[A6] Copy button shows "Copied" for 2 seconds, then back to "Copy"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('HELLO')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Encode' }).click()
  const copy = page.getByRole('button', { name: 'Copy' })
  await copy.click()
  // While the clipboard is in the copied state, the original Copy button is gone.
  await expect(copy).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  // The label reverts to Copy after the 2 seconds.
  await expect(copy).toBeVisible({ timeout: 5000 })
})

test('[A7] Add to history creates a removable item with the message and result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('HELLO')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Encode' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
  await page.getByRole('button', { name: 'Add to history' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'HELLO' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('RIJVS')
  await item.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A8] History tab lists the added conversion', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('HELLO')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Encode' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('HELLO')).toBeVisible()
  await expect(page.getByText('RIJVS')).toBeVisible()
})

test('[A9] history survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Message').fill('HELLO')
  await page.getByLabel('Key').fill('KEY')
  await page.getByRole('radio', { name: 'Encode' }).click()
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'HELLO' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('RIJVS')
})
