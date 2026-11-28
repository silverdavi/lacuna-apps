import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Renders Document Converter and converts starter Markdown to HTML', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Document Converter' })).toBeVisible()
  await expect(page.getByLabel('Converted document')).toHaveValue(/<h1>Quarterly Design Brief<\/h1>/)
})

test('[A2] Exports valid DOCX and PDF files and persists title across reload', async ({ page }) => {
  await page.getByLabel('Document title').fill('Launch Memo')
  await page.getByLabel('Target format').selectOption('docx')
  await expect(page.getByLabel('Converted document')).toHaveValue(/Binary OOXML Word document/)

  const docxDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download launch-memo.docx' }).click()
  expect((await docxDl).suggestedFilename()).toBe('launch-memo.docx')

  await page.getByLabel('Target format').selectOption('pdf')
  const pdfDl = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download launch-memo.pdf' }).click()
  expect((await pdfDl).suggestedFilename()).toBe('launch-memo.pdf')

  await page.reload()
  await expect(page.getByLabel('Document title')).toHaveValue('Launch Memo')
})

test('[A3] Converts HTML input back to Markdown', async ({ page }) => {
  await page.getByLabel('Source format').selectOption('html')
  await page.getByLabel('Target format').selectOption('markdown')
  await page.getByLabel('Source document').fill('<h1>Hello</h1><p>World <strong>bold</strong></p>')
  await expect(page.getByLabel('Converted document')).toHaveValue(/# Hello/)
  await expect(page.getByLabel('Converted document')).toHaveValue(/\*\*bold\*\*/)
})
