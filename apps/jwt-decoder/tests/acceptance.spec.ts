import { expect, test, type Page } from '@playwright/test'

const token =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
const twoPart = token.slice(0, token.lastIndexOf('.'))

async function decode(page: Page) {
  await page.getByLabel('Token').fill(token)
  await page.getByRole('button', { name: 'Decode' }).click()
}

test('[A1] decoding the spec token shows Header and Payload with the expected claims', async ({ page }) => {
  await page.goto('/')
  await decode(page)
  await expect(page.getByText('"alg":"HS256"')).toBeVisible()
  await expect(page.getByText('"name":"John Doe"')).toBeVisible()
})

test('[A2] Copy Header changes to Copied and puts the compact header JSON on the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await decode(page)
  const copyHeader = page.getByRole('button', { name: 'Copy Header' })
  await copyHeader.click()
  await expect(copyHeader).toHaveText('Copied')
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('{"alg":"HS256","typ":"JWT"}')
  await expect(copyHeader).toHaveText('Copy Header')
})

test('[A3] a token without two dots shows the format error and no Header or Payload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Token').fill('invalid.token.here')
  await page.getByRole('button', { name: 'Decode' }).click()
  await expect(page.getByText('Invalid JWT format: expected three parts separated by dots')).toBeVisible()
  await expect(page.getByText('Header', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Payload', { exact: true })).toHaveCount(0)
})

test('[A4] dropping token.txt fills the Token field and decodes automatically', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('region', { name: 'Drop token file' }).setInputFiles({
    name: 'token.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(token),
  })
  await expect(page.getByLabel('Token')).toHaveValue(token)
  await expect(page.getByText('"alg":"HS256"')).toBeVisible()
  await expect(page.getByText('"name":"John Doe"')).toBeVisible()
})

test('[A5] the Signature section shows the signature part and a Copy Signature button', async ({ page }) => {
  await page.goto('/')
  await decode(page)
  await expect(page.getByText('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy Signature' })).toBeVisible()
})

test('[A6] Export JSON downloads jwt-decode-<timestamp>.json with header, payload and signature', async ({ page }) => {
  await page.goto('/')
  await decode(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ])
  const name = download.suggestedFilename()
  expect(name).toMatch(/^jwt-decode-\d+\.json$/)
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const data = JSON.parse(readFileSync(path, 'utf8'))
  expect(data).toHaveProperty('header')
  expect(data).toHaveProperty('payload')
  expect(data).toHaveProperty('signature')
  expect(data.payload.name).toBe('John Doe')
})

test('[A7] History gains an item with John Doe and the timestamp, and clicking it restores the token', async ({
  page,
}) => {
  await page.goto('/')
  await decode(page)
  const item = page.getByRole('listitem').filter({ hasText: 'John Doe' })
  await expect(item).toBeVisible()
  await item.click()
  await expect(page.getByLabel('Token')).toHaveValue(token)
})

test('[A8] a two-part token shows the format error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Token').fill(twoPart)
  await page.getByRole('button', { name: 'Decode' }).click()
  await expect(page.getByText('Invalid JWT format: expected three parts separated by dots')).toBeVisible()
})

test('[A9] the History entry survives a reload', async ({ page }) => {
  await page.goto('/')
  await decode(page)
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'John Doe' })).toBeVisible()
})
