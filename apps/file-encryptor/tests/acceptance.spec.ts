import { expect, test, type Page } from '@playwright/test'

const NOTES = Buffer.from('hello world')

async function loadFile(page: Page, name: string, buffer: Buffer, mimeType: string) {
  const chooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Drop a file or click to browse').click()
  const chooser = await chooserPromise
  await chooser.setFiles({ name, mimeType, buffer })
}

// encrypts the current file via the UI and returns the downloaded bytes.
async function encryptAndDownload(page: Page, passphrase: string) {
  await page.getByLabel('Passphrase', { exact: true }).fill(passphrase)
  await page.getByLabel('Mode').selectOption('Encrypt')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByRole('status')).toHaveText('Encrypted notes.txt')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download result' }).click()
  const download = await downloadPromise
  const { readFileSync } = await import('node:fs')
  return readFileSync(await download.path())
}

test('[A1] shows the heading and drop zone text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'File Encryptor' })).toBeVisible()
  await expect(page.getByText('Drop a file or click to browse')).toBeVisible()
})

test('[A2] loading notes.txt shows the preview panel', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'notes.txt', NOTES, 'text/plain')
  await expect(page.getByText('notes.txt')).toBeVisible()
  await expect(page.getByText('11 bytes')).toBeVisible()
  await expect(page.getByText('hello world')).toBeVisible()
})

test('[A3] encrypting notes.txt succeeds and enables the download button', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'notes.txt', NOTES, 'text/plain')
  const downloadButton = page.getByRole('button', { name: 'Download result' })
  await expect(downloadButton).toBeDisabled()
  await page.getByLabel('Passphrase', { exact: true }).fill('secret123')
  await page.getByLabel('Mode').selectOption('Encrypt')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByRole('status')).toHaveText('Encrypted notes.txt')
  await expect(downloadButton).toBeEnabled()
})

test('[A4] the download is suggested as notes.txt.enc', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'notes.txt', NOTES, 'text/plain')
  const downloadPromise = page.waitForEvent('download')
  await page.getByLabel('Passphrase', { exact: true }).fill('secret123')
  await page.getByLabel('Mode').selectOption('Encrypt')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByRole('status')).toHaveText('Encrypted notes.txt')
  await page.getByRole('button', { name: 'Download result' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('notes.txt.enc')
})

test('[A5] round-trip: encrypt, download, reload, decrypt, and see the original text', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'notes.txt', NOTES, 'text/plain')
  const bytes = await encryptAndDownload(page, 'secret123')

  await page.goto('/')
  await loadFile(page, 'notes.txt.enc', bytes, 'application/octet-stream')
  await page.getByLabel('Passphrase', { exact: true }).fill('secret123')
  await page.getByLabel('Mode').selectOption('Decrypt')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByRole('status')).toHaveText('Decrypted notes.txt.enc')
  await expect(page.getByText('hello world')).toBeVisible()
})

test('[A6] a successful operation is listed and the list can be cleared', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'notes.txt', NOTES, 'text/plain')
  await page.getByLabel('Passphrase', { exact: true }).fill('secret123')
  await page.getByLabel('Mode').selectOption('Encrypt')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByRole('status')).toHaveText('Encrypted notes.txt')

  const list = page.getByLabel('Recent operations')
  const item = list.getByRole('listitem').filter({ hasText: 'notes.txt' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('Encrypt')
  await expect(item).toContainText(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/)

  await page.getByRole('button', { name: 'Clear list' }).click()
  await expect(list.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No operations yet')).toBeVisible()
})

test('[A7] saving the default passphrase persists across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Default passphrase', { exact: true }).fill('defaultpass')
  await page.getByRole('button', { name: 'Save default' }).click()
  await expect(page.getByRole('status')).toHaveText('Default passphrase saved')

  await page.goto('/')
  await expect(page.getByLabel('Default passphrase', { exact: true })).toHaveValue('defaultpass')
})

test('[A8] decrypting a plain file with the wrong passphrase fails', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'notes.txt', NOTES, 'text/plain')
  await page.getByLabel('Passphrase', { exact: true }).fill('wrongpass')
  await page.getByLabel('Mode').selectOption('Decrypt')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByRole('alert')).toHaveText('Decryption failed: invalid passphrase or corrupted file')
})

test('[A9] the default passphrase is loaded into the field after saving', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Default passphrase', { exact: true }).fill('defaultpass')
  await page.getByRole('button', { name: 'Save default' }).click()
  await expect(page.getByRole('status')).toHaveText('Default passphrase saved')

  await page.goto('/')
  await expect(page.getByLabel('Default passphrase', { exact: true })).toHaveValue('defaultpass')
})
