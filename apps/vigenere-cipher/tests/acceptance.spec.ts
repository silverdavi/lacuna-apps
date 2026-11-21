import { expect, test, type Page } from '@playwright/test'

async function fillInputs(page: Page, message: string, key: string) {
  await page.getByLabel('Message').fill(message)
  await page.getByLabel('Key').fill(key)
}

async function selectMode(page: Page, mode: 'Encode' | 'Decode') {
  await page.getByLabel(mode, { exact: true }).check()
}

test('[A1] page shows the heading Vigenere Cipher', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vigenere Cipher' })).toBeVisible()
})

test('[A2] encoding HELLO with key KEY shows RIJVS in the Result field', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'HELLO', 'KEY')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
})

test('[A3] decoding RIJVS with key KEY shows HELLO in the Result field', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'RIJVS', 'KEY')
  await selectMode(page, 'Decode')
  await expect(page.getByLabel('Result')).toHaveValue('HELLO')
})

test('[A4] encoding lowercase hello with key key keeps lowercase rijvs in the Result field', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'hello', 'key')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('rijvs')
})

test('[A5] encoding HELLO WORLD with key KEY shows RIJVS UYVJH in the Result field', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'HELLO WORLD', 'KEY')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS UYVJH')
})

test('[A6] Copy button switches to Copied for 2 seconds, then back to Copy', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'HELLO', 'KEY')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
  const copy = page.getByRole('button', { name: 'Copy' })
  await copy.click()
  const start = Date.now()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeHidden()
  const elapsed = Date.now() - start
  // The spec fixes the Copied lifetime at 2 seconds; waiting for the label to
  // hide cannot finish before it is due, and the round-trip slack is bounded.
  expect(elapsed).toBeGreaterThanOrEqual(2000)
  expect(elapsed).toBeLessThan(5000)
  await expect(copy).toBeVisible()
  await expect(copy).toHaveText('Copy')
})

test('[A7] Add to history adds an item with HELLO and RIJVS, Delete removes it', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'HELLO', 'KEY')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
  await page.getByRole('button', { name: 'Add to history' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'HELLO' }).filter({ hasText: 'RIJVS' })
  await expect(item).toHaveCount(1)
  await item.getByRole('button', { name: 'Delete' }).click()
  await expect(item).toHaveCount(0)
})

test('[A8] History tab shows the list of previous conversions, one item after adding one', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'HELLO', 'KEY')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
  await page.getByRole('button', { name: 'Add to history' }).click()
  const tab = page.getByRole('tab', { name: 'History' })
  await tab.click()
  const item = page.getByRole('listitem').filter({ hasText: 'HELLO' }).filter({ hasText: 'RIJVS' })
  await expect(item).toHaveCount(1)
})

test('[A9] reload keeps the history item with HELLO and RIJVS', async ({ page }) => {
  await page.goto('/')
  await fillInputs(page, 'HELLO', 'KEY')
  await selectMode(page, 'Encode')
  await expect(page.getByLabel('Result')).toHaveValue('RIJVS')
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'HELLO' }).filter({ hasText: 'RIJVS' })
  await expect(item).toHaveCount(1)
})
