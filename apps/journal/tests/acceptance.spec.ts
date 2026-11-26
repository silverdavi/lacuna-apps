import { expect, test } from '@playwright/test'


test('[A1] empty app shows heading, status bar and editor', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Daily Journal App' })).toBeVisible()
  await expect(page.getByText('Saved')).toBeVisible()
  const ed = page.getByRole('textbox', { name: 'Entry' })
  await expect(ed).toBeVisible()
  await expect(ed).toHaveValue('')
})

test('[A2] typing "Buy milk" and Ctrl+S shows "Saved" and the preview shows the text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Entry' }).fill('Buy milk')
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Saved')).toBeVisible()
  const preview = page.getByText('Buy milk').nth(1)
  await expect(preview).toBeVisible()
})

test('[A3] clicking the "Task A" checkbox in the preview checks the box in the editor', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Entry' }).fill('- [ ] Task A')
  await expect(page.getByText('Saved')).toBeVisible()
  await page.getByRole('checkbox').first().click()
  await expect(page.getByRole('textbox', { name: 'Entry' })).toHaveValue('- [x] Task A')
  await expect(page.getByText('Saved')).toBeVisible()
})

test('[A4] "Lock entry" encrypts with "secret123" and the editor becomes read-only with "Locked"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lock entry' }).click()
  await page.getByLabel('Passphrase').fill('secret123')
  await page.getByRole('button', { name: 'Encrypt' }).click()
  await expect(page.getByText('Encrypted')).toBeVisible()
  const ed = page.getByRole('textbox', { name: 'Entry' })
  await expect(ed).toBeReadOnly()
  await expect(ed).toHaveValue('Locked')
})

test('[A5] unlocking with "wrongpass" shows "Invalid passphrase" and stays "Encrypted"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Lock entry' }).click()
  await page.getByLabel('Passphrase').fill('secret123')
  await page.getByRole('button', { name: 'Encrypt' }).click()
  await expect(page.getByText('Encrypted')).toBeVisible()
  await page.getByRole('button', { name: 'Unlock entry' }).click()
  await page.getByLabel('Passphrase').fill('wrongpass')
  await page.getByRole('button', { name: 'Decrypt' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Invalid passphrase')).toBeVisible()
  await expect(page.getByText('Encrypted')).toBeVisible()
})

test('[A6] unlocking with "secret123" restores the entry and shows "Saved"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Entry' }).fill('- [ ] Task A')
  await expect(page.getByText('Saved')).toBeVisible()
  await page.getByRole('checkbox').first().click()
  await expect(page.getByRole('textbox', { name: 'Entry' })).toHaveValue('- [x] Task A')
  await page.getByRole('button', { name: 'Lock entry' }).click()
  await page.getByLabel('Passphrase').fill('secret123')
  await page.getByRole('button', { name: 'Encrypt' }).click()
  await expect(page.getByText('Encrypted')).toBeVisible()
  await page.getByRole('button', { name: 'Unlock entry' }).click()
  await page.getByLabel('Passphrase').fill('secret123')
  await page.getByRole('button', { name: 'Decrypt' }).click()
  const ed = page.getByRole('textbox', { name: 'Entry' })
  await expect(ed).toHaveValue('- [x] Task A')
  await expect(ed).toBeEnabled()
  await expect(page.getByText('Saved')).toBeVisible()
})

test('[A7] "Export backup" downloads journal-backup.json with version 1 and the entry', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Entry' }).fill('- [x] Task A')
  await expect(page.getByText('Saved')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('journal-backup.json')
  const { readFileSync } = await import('node:fs')
  const body = readFileSync((await download.path())!, 'utf8')
  const parsed = JSON.parse(body)
  expect(parsed.version).toBe(1)
  expect(body).toContain('- [x] Task A')
})

test('[A8] "Import backup" with the exported file restores the entry', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Entry' }).fill('- [x] Task A')
  await expect(page.getByText('Saved')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ])
  const path = await download.path()
  const ed = page.getByRole('textbox', { name: 'Entry' })
  await ed.fill('New day')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import backup' }).click(),
  ])
  await chooser.setFiles(path!)
  await expect(ed).toHaveValue('- [x] Task A')
  await expect(page.getByText('Saved')).toBeVisible()
})

test('[A9] reloading keeps "Buy milk" in the editor and the status shows "Saved"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Entry' }).fill('Buy milk')
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Saved')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Entry' })).toHaveValue('Buy milk')
  await expect(page.getByText('Saved')).toBeVisible()
})
