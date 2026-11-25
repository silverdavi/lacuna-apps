import { expect, test } from '@playwright/test'

const SHA256_HELLO_HEX = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

test('[A1] shows the heading and empty-input placeholder text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hash Generator' })).toBeVisible()
  await expect(page.getByText('Enter text to hash')).toBeVisible()
})

test('[A2] SHA-256 hex of "hello" shows the expected digest in Result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await expect(page.getByLabel('Result')).toHaveValue(SHA256_HELLO_HEX)
})

test('[A3] SHA-1 base64 of "hello" shows the expected digest in Result', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-1')
  await page.getByLabel('Encoding').selectOption('base64')
  await expect(page.getByLabel('Result')).toHaveValue('qvTGHdzF6KLavt4PO0gs2a6pQ00=')
})

test('[A4] url encoding leaves the unreserved hex string unchanged', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('url')
  await expect(page.getByLabel('Result')).toHaveValue(SHA256_HELLO_HEX)
})

test('[A5] Copy result copies the digest to the clipboard and reports Copied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe(SHA256_HELLO_HEX)
})

test('[A6] Add to history appends a row with the input, algorithm, encoding and digest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Add to history' }).click()
  const row = page.getByRole('table', { name: 'History' }).getByRole('row').filter({ has: page.getByRole('cell', { name: 'hello' }) })
  await expect(row.getByRole('cell')).toHaveText(['hello', 'SHA-256', 'hex', SHA256_HELLO_HEX])
})

test('[A7] Clear history removes all rows and shows "No history yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByRole('row', { name: 'hello' })).toHaveCount(0)
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A8] SHA-512 hex of "hello" shows the expected 128-character digest', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-512')
  await page.getByLabel('Encoding').selectOption('hex')
  await expect(page.getByLabel('Result')).toHaveValue(
    '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043',
  )
})

test('[A9] history persists across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.reload()
  const row = page.getByRole('table', { name: 'History' }).getByRole('row').filter({ has: page.getByRole('cell', { name: 'hello' }) })
  await expect(row.getByRole('cell')).toHaveText(['hello', 'SHA-256', 'hex', SHA256_HELLO_HEX])
})
