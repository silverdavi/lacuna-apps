import { expect, test, type FileChooser, type Page } from '@playwright/test'

// Exactly 11 bytes: "hello world" with no trailing newline.
const NOTES = { name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello world', 'utf8') }

// Loads a file through the app's real file input, the way the drop zone's
// browse affordance drives it.
async function loadFile(page: Page, file: Parameters<FileChooser['setFiles']>[0]) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByText('Drop a file or click to browse').click(),
  ])
  await chooser.setFiles(file)
}

// Encrypts the loaded file with the given passphrase.
async function encrypt(page: Page, passphrase: string) {
  await page.getByLabel('Passphrase').fill(passphrase)
  await page.getByLabel('Mode').selectOption({ label: 'Encrypt' })
  await page.getByRole('button', { name: 'Transform' }).click()
}

// Decrypts the loaded file with the given passphrase.
async function decrypt(page: Page, passphrase: string) {
  await page.getByLabel('Passphrase').fill(passphrase)
  await page.getByLabel('Mode').selectOption({ label: 'Decrypt' })
  await page.getByRole('button', { name: 'Transform' }).click()
}

// Captures the result of the last transform by downloading it.
async function downloadedResult(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download result' }).click(),
  ])
  const { readFileSync } = await import('node:fs')
  return { download, body: readFileSync(await download.path()!) }
}

test('[A1] the page shows the heading and the drop hint', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'File Encryptor' })).toBeVisible()
  await expect(page.getByText('Drop a file or click to browse')).toBeVisible()
})

test('[A2] dropping notes.txt shows the filename, the size and the content in the preview', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, NOTES)
  await expect(page.getByText('notes.txt')).toBeVisible()
  await expect(page.getByText('11 bytes')).toBeVisible()
  await expect(page.getByText('hello world')).toBeVisible()
})

test('[A3] encrypting notes.txt with secret123 reports success and enables the download', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, NOTES)
  await encrypt(page, 'secret123')
  await expect(page.getByText('Encrypted notes.txt')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download result' })).toBeEnabled()
})

test('[A4] downloading the result of encrypting notes.txt triggers a file named notes.txt.enc', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, NOTES)
  await encrypt(page, 'secret123')
  await expect(page.getByText('Encrypted notes.txt')).toBeVisible()
  const { download } = await downloadedResult(page)
  expect(download.suggestedFilename()).toBe('notes.txt.enc')
})

// A5's "valid encrypted content" is produced in-test: encrypt notes.txt,
// download the result, then feed that exact payload back to the decrypt step.
test('[A5] decrypting the encrypted notes.txt with secret123 reports success and restores the content', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, NOTES)
  await encrypt(page, 'secret123')
  await expect(page.getByText('Encrypted notes.txt')).toBeVisible()
  const { body } = await downloadedResult(page)
  await loadFile(page, { name: 'notes.txt.enc', mimeType: 'application/octet-stream', buffer: body })
  await decrypt(page, 'secret123')
  await expect(page.getByText('Decrypted notes.txt.enc')).toBeVisible()
  await expect(page.getByText('hello world')).toBeVisible()
})

test('[A6] encrypting lists a recent operation, and Clear list empties it', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, NOTES)
  await encrypt(page, 'secret123')
  await expect(page.getByText('Encrypted notes.txt')).toBeVisible()
  const item = page.getByRole('listitem').filter({ hasText: 'notes.txt' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('Encrypt')
  // The spec fixes the item content as filename, mode and timestamp;
  // "notes.txt" + "Encrypt" can only appear once per item.
  const text = await item.innerText()
  expect(text.includes('notes.txt')).toBe(true)
  expect(text.includes('Encrypt')).toBe(true)
  expect(text.match(/Encrypt/g)?.length).toBe(1)
  await page.getByRole('button', { name: 'Clear list' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No operations yet')).toBeVisible()
})

test('[A7] saving a default passphrase confirms it and the value persists', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Default passphrase').fill('defaultpass')
  await page.getByRole('button', { name: 'Save default' }).click()
  await expect(page.getByText('Default passphrase saved')).toBeVisible()
  await expect(page.getByLabel('Default passphrase')).toHaveValue('defaultpass')
})

// A8 tests the wrong-passphrase error against the app's real output: encrypt
// first, then feed that payload back to the decrypt step with a bad passphrase.
test('[A8] decrypting with a wrong passphrase reports the failure message', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, NOTES)
  await encrypt(page, 'secret123')
  await expect(page.getByText('Encrypted notes.txt')).toBeVisible()
  const { body } = await downloadedResult(page)
  await loadFile(page, { name: 'notes.txt.enc', mimeType: 'application/octet-stream', buffer: body })
  await decrypt(page, 'wrongpass')
  await expect(page.getByText('Decryption failed: invalid passphrase or corrupted file')).toBeVisible()
})

// A9 is the reload half of A7: the spec splits persistence into two checks,
// so the reload assertion lives in its own test.
test('[A9] the saved default passphrase survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Default passphrase').fill('defaultpass')
  await page.getByRole('button', { name: 'Save default' }).click()
  await expect(page.getByText('Default passphrase saved')).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Default passphrase')).toHaveValue('defaultpass')
})
