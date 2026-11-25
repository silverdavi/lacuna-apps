import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

// A 120x90 JPEG, built by the page's own canvas so the test makes no network
// request. The bytes are a valid JPEG (the browser encodes them).
async function jpg(page: Page): Promise<Buffer> {
  const buf = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 90
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#123456'
    ctx.fillRect(0, 0, 120, 90)
    ctx.fillStyle = '#ABCDEF'
    ctx.fillRect(0, 0, 60, 45)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg'),
    )
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return Buffer.from(buf)
}

async function png(page: Page): Promise<Buffer> {
  const buf = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 90
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#0F0'
    ctx.fillRect(0, 0, 120, 90)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    )
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return Buffer.from(buf)
}

// Adds one receipt photo by answering the native file chooser the same way a
// person using the app's add-receipt affordance would.
async function addReceipt(page: Page, name: string, buffer: Buffer, mime: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: /add.*receipt/i }).click(),
  ])
  await chooser.setFiles({ name, mimeType: mime, buffer })
}

// Returns all text findable in a PDF's byte stream: the raw bytes plus the
// contents of every FlateDecode-compressed stream, so cover-sheet text is
// searchable whether or not the generator compresses.
function pdfText(bytes: Buffer): string {
  let text = bytes.toString('latin1')
  const re = /stream\r?\n([\s\S]*?)\r?\nendstream/g
  let m: RegExpExecArray | null
  while ((m = re.exec(bytes.toString('latin1'))) !== null) {
    try {
      text += inflateSync(Buffer.from(m[1], 'latin1')).toString('utf8')
    } catch {
      // not a flate stream; leave the raw bytes in `text`
    }
  }
  return text
}

const generateButton = (page: Page) => page.getByRole('button', { name: 'Generate PDF' })
const sendButton = (page: Page) => page.getByRole('button', { name: 'Send to Expenses App' })
const status = (page: Page) => page.getByRole('status')
const thumbnail = (page: Page, label: string) =>
  page.locator('li', { hasText: label }).locator('img')

test('[A1] uploading a JPEG receipt shows a thumbnail labelled Receipt 1', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'receipt.jpg', await jpg(page), 'image/jpeg')
  await expect(thumbnail(page, 'Receipt 1')).toBeVisible()
  await expect(page.locator('li', { hasText: 'Receipt 1' })).toHaveCount(1)
})

test('[A2] Add Another Receipt uploads a second PNG receipt', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await addReceipt(page, 'b.png', await png(page), 'image/png')
  const list = page.locator('li')
  await expect(list).toHaveCount(2)
  await expect(page.locator('li', { hasText: 'Receipt 1' })).toHaveCount(1)
  await expect(page.locator('li', { hasText: 'Receipt 2' })).toHaveCount(1)
  await expect(thumbnail(page, 'Receipt 2')).toBeVisible()
})

test('[A3] Generate PDF with two receipts downloads a PDF larger than 0 bytes', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await addReceipt(page, 'b.png', await png(page), 'image/png')
  const [download] = await Promise.all([page.waitForEvent('download'), generateButton(page).click()])
  const data = readFileSync((await download.path())!)
  expect(data.length, 'PDF is larger than 0 bytes').toBeGreaterThan(0)
  expect(data.subarray(0, 5).toString(), 'download is a PDF').toBe('%PDF-')
  expect(download.suggestedFilename()).toMatch(/\.pdf$/)
})

test('[A4] the cover sheet lists each receipt label, date and amount from those fields', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await addReceipt(page, 'b.png', await png(page), 'image/png')
  await page.getByLabel('Date').nth(0).fill('2025-04-05')
  await page.getByLabel('Amount').nth(0).fill('12.34')
  await page.getByLabel('Date').nth(1).fill('2025-04-06')
  await page.getByLabel('Amount').nth(1).fill('56.78')
  const [download] = await Promise.all([page.waitForEvent('download'), generateButton(page).click()])
  const raw = pdfText(readFileSync((await download.path())!))
  expect(raw, 'cover sheet names Receipt 1').toContain('Receipt 1')
  expect(raw, 'cover sheet names Receipt 2').toContain('Receipt 2')
  expect(raw, 'cover sheet carries the first date').toContain('2025-04-05')
  expect(raw, 'cover sheet carries the second date').toContain('2025-04-06')
  expect(raw, 'cover sheet carries the first amount').toContain('12.34')
  expect(raw, 'cover sheet carries the second amount').toContain('56.78')
})

test('[A5] with a receipt dated 2025-04-05 the PDF is named Receipt Packet_2025-04-05.pdf', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await page.getByLabel('Date').first().fill('2025-04-05')
  const [download] = await Promise.all([page.waitForEvent('download'), generateButton(page).click()])
  expect(download.suggestedFilename()).toBe('Receipt Packet_2025-04-05.pdf')
})

test('[A6] Send to Expenses App saves the PDF and shows the status text', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await page.getByLabel('Date').first().fill('2025-04-05')
  const [download] = await Promise.all([page.waitForEvent('download'), sendButton(page).click()])
  expect(download.suggestedFilename(), 'the PDF is saved on the fallback path').toBe('Receipt Packet_2025-04-05.pdf')
  await expect(status(page)).toHaveText('Sent to Expenses App: Receipt Packet_2025-04-05.pdf')
  expect(page.url(), 'the send never navigates away').toBe('http://127.0.0.1/')
})

test('[A7] Crop opens a panel; applying 100x80 shows Cropped to 100 × 80', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await page.getByRole('button', { name: 'Crop' }).click()
  await expect(page.getByLabel('Crop width')).toBeVisible()
  await expect(page.getByLabel('Crop height')).toBeVisible()
  await page.getByLabel('Crop width').fill('100')
  await page.getByLabel('Crop height').fill('80')
  await page.getByRole('button', { name: 'Apply crop' }).click()
  await expect(page.getByText('Cropped to 100 × 80')).toBeVisible()
})

test('[A8] Rotate turns the thumbnail 90 degrees and sets data-rotation to 90', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  const before = await thumbnail(page, 'Receipt 1').getAttribute('data-rotation')
  await page.getByRole('button', { name: 'Rotate' }).click()
  const after = await thumbnail(page, 'Receipt 1').getAttribute('data-rotation')
  expect(before, 'starts at 0').toBe('0')
  expect(after, 'rotates to 90').toBe('90')
})

test('[A9] reload keeps the receipts with their original labels and thumbnails', async ({ page }) => {
  await page.goto('/')
  await addReceipt(page, 'a.jpg', await jpg(page), 'image/jpeg')
  await addReceipt(page, 'b.png', await png(page), 'image/png')
  await page.getByLabel('Date').first().fill('2025-04-05')
  await page.reload()
  const list = page.locator('li')
  await expect(list).toHaveCount(2)
  await expect(page.locator('li', { hasText: 'Receipt 1' })).toHaveCount(1)
  await expect(page.locator('li', { hasText: 'Receipt 2' })).toHaveCount(1)
  await expect(thumbnail(page, 'Receipt 1')).toBeVisible()
  await expect(thumbnail(page, 'Receipt 2')).toBeVisible()
})
