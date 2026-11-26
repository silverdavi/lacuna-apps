import { expect, test, type Page } from '@playwright/test'

// Selects a PDF file through the file picker opened by the upload control.
async function choosePdf(page: Page, fileName: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Upload PDF' }).click(),
  ])
  await chooser.setFiles({ name: fileName, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })
}

// Adds a document by selecting a file through the upload control.
async function addDocument(page: Page, fileName = 'contract.pdf') {
  await choosePdf(page, fileName)
}

// Draws a line on the signature pad and saves the signature.
async function saveSignature(page: Page) {
  await page.getByRole('button', { name: 'Draw signature' }).click()
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible()
  const box = await canvas.boundingBox()
  const x = box!.x
  const y = box!.y
  const w = box!.width
  const h = box!.height
  const steps = 10
  await page.mouse.move(x + w / 4, y + h / 2)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(x + w / 4 + ((3 * w) / 4) * (i / steps), y + h / 2, { steps: 2 })
  }
  await page.mouse.up()
  await page.getByRole('button', { name: 'Save signature' }).click()
}

test('[A1] Documents tab shows heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'PDF Document Signer' })).toBeVisible()
  await page.getByRole('tab', { name: 'Documents' }).click()
  await expect(page.getByText('No documents yet')).toBeVisible()
})

test('[A2] uploading a PDF adds a document with the file name and page count', async ({ page }) => {
  await page.goto('/')
  await addDocument(page, 'contract.pdf')
  const item = page.getByRole('listitem').filter({ hasText: 'contract.pdf' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('1 page')
})

test('[A3] drawing a signature adds Signature 1 to the Signatures tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Sign' }).click()
  await saveSignature(page)
  await page.getByRole('tab', { name: 'Signatures' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Signature 1' })).toBeVisible()
})

test('[A4] placing the selected signature on the selected document adds an annotation', async ({ page }) => {
  await page.goto('/')
  await addDocument(page, 'contract.pdf')
  await page.getByRole('tab', { name: 'Sign' }).click()
  await saveSignature(page)
  await page.getByRole('button', { name: 'Place signature' }).click()
  await page.getByRole('tab', { name: 'Annotations' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'contract.pdf' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('Signature 1')
})

test('[A5] deleting an annotation removes it and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addDocument(page, 'contract.pdf')
  await page.getByRole('tab', { name: 'Sign' }).click()
  await saveSignature(page)
  await page.getByRole('button', { name: 'Place signature' }).click()
  await page.getByRole('tab', { name: 'Annotations' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'contract.pdf' })
  await item.getByRole('button', { name: 'Delete annotation' }).click()
  await expect(page.getByText('No annotations yet')).toBeVisible()
})

test('[A6] downloading the signed PDF triggers a download of contract-signed.pdf', async ({ page }) => {
  await page.goto('/')
  await addDocument(page, 'contract.pdf')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('listitem').filter({ hasText: 'contract.pdf' }).getByRole('button', { name: 'Download signed' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('contract-signed.pdf')
})

test('[A7] placing the signature on a different page records that page in the annotation', async ({ page }) => {
  await page.goto('/')
  await addDocument(page, 'contract.pdf')
  await page.getByRole('tab', { name: 'Sign' }).click()
  await saveSignature(page)
  await page.getByLabel('Page').selectOption('2')
  await page.getByRole('button', { name: 'Place signature' }).click()
  await page.getByRole('tab', { name: 'Annotations' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'contract.pdf' })
  await expect(item).toContainText('Page 2')
})

test('[A8] document and annotation persist across a reload', async ({ page }) => {
  await page.goto('/')
  await addDocument(page, 'contract.pdf')
  await page.getByRole('tab', { name: 'Sign' }).click()
  await saveSignature(page)
  await page.getByRole('button', { name: 'Place signature' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'Documents' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'contract.pdf' })).toBeVisible()
  await page.getByRole('tab', { name: 'Annotations' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'contract.pdf' })).toBeVisible()
})
