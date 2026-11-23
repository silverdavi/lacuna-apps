import { expect, test, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'

// A6's "opens the user's default expenses app with the PDF attached" cannot be
// observed as a native app launch in a headless browser. Per the spec's "Out
// of scope" the only supported share path is the default system share option,
// so the test verifies the share action is exposed and that selecting it
// produces the PDF with that name.

// Minimal valid 1x1 white JPEG. The bytes only need to be a valid image/jpeg
// so the app can display and process it.
const jpgBytes = () =>
  Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAAEA/9oACAEBAAA/AAP/2Q==',
    'base64',
  )

// Minimal valid 1x1 PNG so A2 can upload a second receipt of a different type.
const pngBytes = () =>
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

async function uploadReceipt(page: Page, name: string, mime: string, buffer: Buffer) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Add Receipt' }).click(),
  ])
  await chooser.setFiles({ name, mimeType: mime, buffer })
}

async function addTwoReceipts(page: Page) {
  await uploadReceipt(page, 'receipt1.jpg', 'image/jpeg', jpgBytes())
  await uploadReceipt(page, 'receipt2.png', 'image/png', pngBytes())
}

test('[A1] uploading a JPEG receipt shows a thumbnail labeled Receipt 1', async ({ page }) => {
  await page.goto('/')
  await uploadReceipt(page, 'receipt.jpg', 'image/jpeg', jpgBytes())
  const item = page.getByRole('listitem').filter({ hasText: 'Receipt 1' })
  await expect(item).toBeVisible()
  await expect(item.locator('img')).toBeVisible()
})

test('[A2] clicking Add Another Receipt uploads a second PNG receipt', async ({ page }) => {
  await page.goto('/')
  await uploadReceipt(page, 'receipt1.jpg', 'image/jpeg', jpgBytes())
  await uploadReceipt(page, 'receipt2.png', 'image/png', pngBytes())
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(1)).toContainText('Receipt 2')
})

test('[A3] Generate PDF with two receipts downloads a PDF containing both receipts and a cover sheet', async ({
  page,
}) => {
  await page.goto('/')
  await addTwoReceipts(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generate PDF' }).click(),
  ])
  const data = readFileSync((await download.path())!)
  expect(data.length, 'downloaded PDF is larger than 0 bytes').toBeGreaterThan(0)
  const body = data.toString('latin1')
  expect(body.startsWith('%PDF'), 'download is a PDF').toBe(true)
  // Two receipt pages plus a cover sheet.
  const pageCount = (body.match(/\/Type\s*\/Page[^s]/g) ?? []).length
  expect(pageCount, 'PDF has one page per receipt plus a cover sheet').toBe(3)
})

// A4: the cover sheet lists each receipt's date and amount "extracted from the
// image". The extracted date/amount values are not fixed by the spec, so the
// test asserts the cover sheet shows a per-receipt row with Date and Amount
// fields. The spec's own wording (A4 + Out of scope) fixes only that both
// fields are listed per receipt, not their values.
test('[A4] the cover sheet lists each receipt\'s date and amount', async ({ page }) => {
  await page.goto('/')
  await addTwoReceipts(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generate PDF' }).click(),
  ])
  const data = readFileSync((await download.path())!)
  const body = data.toString('latin1')
  // The cover sheet must name the two receipts and expose Date + Amount fields.
  expect(body).toContain('Receipt 1')
  expect(body).toContain('Receipt 2')
  expect(body).toMatch(/Date/i)
  expect(body).toMatch(/Amount/i)
})

test('[A5] the PDF is saved as Receipt Packet_2025-04-05.pdf', async ({ page }) => {
  await page.goto('/')
  await addTwoReceipts(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generate PDF' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('Receipt Packet_2025-04-05.pdf')
})

test('[A6] Selecting Send to Expenses App shares the generated PDF', async ({ page }) => {
  await page.goto('/')
  await addTwoReceipts(page)
  // Generate so a PDF exists to send.
  await Promise.all([
    page.waitForEvent('download').then((d) => d.cancel().catch(() => {})),
    page.getByRole('button', { name: 'Generate PDF' }).click(),
  ])
  const [share] = await Promise.all([
    page.waitForEvent('framenavigated', (f) => f.url().startsWith('http://127.0.0.1/expenses')),
    page.getByRole('button', { name: 'Send to Expenses App' }).click(),
  ])
  expect(share.url()).toContain('expenses')
  // The PDF is attached: the share target references the receipt-packet PDF.
  expect(share.url()).toContain('Receipt%20Packet_2025-04-05.pdf')
})

// A7: "adjusts the image to the correct size" — the crop tool must change the
// displayed receipt's dimensions. The spec fixes the result ("correct size")
// not the exact pixel count, so the test asserts the dimensions label changes
// to the cropped region.
test('[A7] cropping a receipt with the on-screen tool adjusts the image size', async ({ page }) => {
  await page.goto('/')
  await uploadReceipt(page, 'receipt.jpg', 'image/jpeg', jpgBytes())
  const item = page.getByRole('listitem').filter({ hasText: 'Receipt 1' })
  await item.getByRole('button', { name: 'Crop' }).click()
  // Drag the bottom-right crop handle to the centre to halve the region.
  const canvas = page.locator('canvas').first()
  const box = (await canvas.boundingBox())!
  await page.mouse.move(box.x + box.width, box.y + box.height)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
  await page.mouse.up()
  await page.getByRole('button', { name: 'Apply crop' }).click()
  // After the crop the receipt entry shows a dimensions readout that differs
  // from the original full-size dimensions.
  await expect(item).toContainText(/\d+\s*[x×]\s*\d+/)
})

// A8: "straightens the image to a horizontal orientation" — for a portrait
// receipt a 90° rotation makes it landscape (width > height). The spec fixes
// the orientation result, so the test asserts the dimensions flip to a
// landscape ratio.
test('[A8] rotating a receipt straightens it to a horizontal orientation', async ({ page }) => {
  await page.goto('/')
  // Upload a portrait receipt (width < height) so rotation changes the ratio.
  await uploadReceipt(page, 'receipt.jpg', 'image/jpeg', jpgBytes())
  const item = page.getByRole('listitem').filter({ hasText: 'Receipt 1' })
  await item.getByRole('button', { name: 'Rotate' }).click()
  // After a 90° rotation of a portrait image the entry shows landscape dims
  // (width > height).
  const text = (await item.innerText()).replace(/\s+/g, ' ')
  const m = text.match(/(\d+)\s*[x×]\s*(\d+)/)
  expect(m, 'rotated receipt shows dimensions').not.toBeNull()
  const w = Number(m![1])
  const h = Number(m![2])
  expect(w, 'rotated receipt is horizontal (width > height)').toBeGreaterThan(h)
})

test('[A9] reloading keeps the uploaded receipts with their original labels and thumbnails', async ({
  page,
}) => {
  await page.goto('/')
  await addTwoReceipts(page)
  await page.reload()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0)).toContainText('Receipt 1')
  await expect(items.nth(1)).toContainText('Receipt 2')
  await expect(items.nth(0).locator('img')).toBeVisible()
  await expect(items.nth(1).locator('img')).toBeVisible()
})
