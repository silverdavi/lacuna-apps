import { expect, test } from '@playwright/test'

test('[A1] shows heading and input label', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hash Generator' })).toBeVisible()
  await expect(page.getByText('Enter text to hash')).toBeVisible()
})

test('[A2] SHA-256 hex of hello', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await expect(page.getByLabel('Result')).toHaveText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})

test('[A3] SHA-1 base64 of hello', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-1')
  await page.getByLabel('Encoding').selectOption('base64')
  await expect(page.getByLabel('Result')).toHaveText('gCqF1eIz9H3D9V2W8X4Y6Z0A1B2=')
})

test('[A4] SHA-256 url encoding is hex, no percent-encoding', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('url')
  await expect(page.getByLabel('Result')).toHaveText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})

test('[A5] Copy result copies digest and shows Copied', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
})

test('[A6] Add to history adds a row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Add to history' }).click()
  const row = page.getByRole('table', { name: 'History' }).getByRole('row').filter({ has: page.getByText('hello') })
  await expect(row.getByText('SHA-256')).toBeVisible()
  await expect(row.getByText('hex')).toBeVisible()
  await expect(row.getByText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')).toBeVisible()
})

test('[A7] Clear history empties the table', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByRole('table', { name: 'History' })).toBeHidden()
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A8] SHA-512 hex of hello', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-512')
  await page.getByLabel('Encoding').selectOption('hex')
  await expect(page.getByLabel('Result')).toHaveText(
    '9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef6627b3466cfc7',
  )
})

test('[A9] history survives reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello')
  await page.getByLabel('Algorithm').selectOption('SHA-256')
  await page.getByLabel('Encoding').selectOption('hex')
  await page.getByRole('button', { name: 'Add to history' }).click()
  await page.reload()
  const row = page.getByRole('table', { name: 'History' }).getByRole('row').filter({ has: page.getByText('hello') })
  await expect(row.getByText('SHA-256')).toBeVisible()
  await expect(row.getByText('hex')).toBeVisible()
  await expect(row.getByText('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')).toBeVisible()
})
