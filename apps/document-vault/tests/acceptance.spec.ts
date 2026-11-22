import { expect, test, type Page } from '@playwright/test'

// Adds a file named `name` with the given content to the vault through the
// drop zone's file chooser (the browse affordance), as a person would.
async function addFile(page: Page, name: string, content: string, mime = 'application/octet-stream') {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Add document' }).click(),
  ])
  await chooser.setFiles({ name, mimeType: mime, buffer: Buffer.from(content) })
}

test('[A1] empty app shows the "Document Vault" heading and "No documents yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Document Vault' })).toBeVisible()
  await expect(page.getByText('No documents yet')).toBeVisible()
})

test('[A2] exporting with an empty vault downloads document-vault-backup.json', async ({ page }) => {
  await page.goto('/')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('document-vault-backup.json')
  const { readFileSync } = await import('node:fs')
  const body = readFileSync((await download.path())!, 'utf8')
  expect(JSON.parse(body)).toEqual({ version: 1, documents: [] })
})

test('[A3] adding invoice.pdf shows a list item with "invoice.pdf" and "1 KB" and removes the empty text', async ({
  page,
}) => {
  await page.goto('/')
  await addFile(page, 'invoice.pdf', 'PDFDATA', 'application/pdf')
  const item = page.getByRole('listitem').filter({ hasText: 'invoice.pdf' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('invoice.pdf')
  await expect(item).toContainText('1 KB')
  await expect(page.getByText('No documents yet')).toHaveCount(0)
})

test('[A4] typing "inv" in Search documents highlights "invoice.pdf" and shows "1 match"', async ({ page }) => {
  await page.goto('/')
  await addFile(page, 'invoice.pdf', 'PDFDATA', 'application/pdf')
  await page.getByLabel('Search documents').fill('inv')
  await expect(page.getByText('1 match')).toBeVisible()
  // The matched item stays in the list with its content.
  const item = page.getByRole('listitem').filter({ hasText: 'invoice.pdf' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('1 KB')
})

test('[A5] clicking "Delete invoice.pdf" removes the item and restores "No documents yet"', async ({ page }) => {
  await page.goto('/')
  await addFile(page, 'invoice.pdf', 'PDFDATA', 'application/pdf')
  await expect(page.getByRole('listitem').filter({ hasText: 'invoice.pdf' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete invoice.pdf' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'invoice.pdf' })).toHaveCount(0)
  await expect(page.getByText('No documents yet')).toBeVisible()
})

test('[A6] exporting with report.txt downloads document-vault-backup.json', async ({ page }) => {
  await page.goto('/')
  await addFile(page, 'report.txt', '', 'text/plain')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export backup' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('document-vault-backup.json')
  const { readFileSync } = await import('node:fs')
  const body = readFileSync((await download.path())!, 'utf8')
  expect(JSON.parse(body)).toEqual({
    version: 1,
    documents: [{ name: 'report.txt', size: 0, content: '' }],
  })
})

test('[A7] importing a backup adds a "scan.jpg" item showing "100 B"', async ({ page }) => {
  await page.goto('/')
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Import backup' }).click(),
  ])
  await chooser.setFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":1,"documents":[{"name":"scan.jpg","size":100,"content":"IMG"}]}'),
  })
  const item = page.getByRole('listitem').filter({ hasText: 'scan.jpg' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('scan.jpg')
  await expect(item).toContainText('100 B')
})

// A8: "View report.txt" opens a dialog whose body is "PDFDATA" -- the spec ties the
// content to the imported document, so the same "PDFDATA" bytes from A3/A9 stand in.
test('[A8] "View report.txt" opens a dialog with heading "report.txt" and body "PDFDATA"', async ({ page }) => {
  await page.goto('/')
  await addFile(page, 'report.txt', 'PDFDATA', 'text/plain')
  await page.getByRole('button', { name: 'View report.txt' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'report.txt' })).toBeVisible()
  await expect(dialog.getByText('PDFDATA')).toBeVisible()
})

test('[A9] reloading keeps "invoice.pdf" in the list with its size "1 KB"', async ({ page }) => {
  await page.goto('/')
  await addFile(page, 'invoice.pdf', 'PDFDATA', 'application/pdf')
  const item = page.getByRole('listitem').filter({ hasText: 'invoice.pdf' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('1 KB')
  await page.reload()
  const reloaded = page.getByRole('listitem').filter({ hasText: 'invoice.pdf' })
  await expect(reloaded).toBeVisible()
  await expect(reloaded).toContainText('1 KB')
})
