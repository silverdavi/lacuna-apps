# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] uploading a JPEG receipt shows a thumbnail labeled Receipt 1
- Location: tests/acceptance.spec.ts:39:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | import { readFileSync } from 'node:fs'
  4   | 
  5   | // A6's "opens the user's default expenses app with the PDF attached" cannot be
  6   | // observed as a native app launch in a headless browser. Per the spec's "Out
  7   | // of scope" the only supported share path is the default system share option,
  8   | // so the test verifies the share action is exposed and that selecting it
  9   | // produces the PDF with that name.
  10  | 
  11  | // Minimal valid 1x1 white JPEG. The bytes only need to be a valid image/jpeg
  12  | // so the app can display and process it.
  13  | const jpgBytes = () =>
  14  |   Buffer.from(
  15  |     '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAAAEA/9oACAEBAAA/AAP/2Q==',
  16  |     'base64',
  17  |   )
  18  | 
  19  | // Minimal valid 1x1 PNG so A2 can upload a second receipt of a different type.
  20  | const pngBytes = () =>
  21  |   Buffer.from(
  22  |     'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  23  |     'base64',
  24  |   )
  25  | 
  26  | async function uploadReceipt(page: Page, name: string, mime: string, buffer: Buffer) {
  27  |   const [chooser] = await Promise.all([
  28  |     page.waitForEvent('filechooser'),
  29  |     page.getByRole('button', { name: 'Add Receipt' }).click(),
  30  |   ])
  31  |   await chooser.setFiles({ name, mimeType: mime, buffer })
  32  | }
  33  | 
  34  | async function addTwoReceipts(page: Page) {
  35  |   await uploadReceipt(page, 'receipt1.jpg', 'image/jpeg', jpgBytes())
  36  |   await uploadReceipt(page, 'receipt2.png', 'image/png', pngBytes())
  37  | }
  38  | 
  39  | test('[A1] uploading a JPEG receipt shows a thumbnail labeled Receipt 1', async ({ page }) => {
> 40  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  41  |   await uploadReceipt(page, 'receipt.jpg', 'image/jpeg', jpgBytes())
  42  |   const item = page.getByRole('listitem').filter({ hasText: 'Receipt 1' })
  43  |   await expect(item).toBeVisible()
  44  |   await expect(item.locator('img')).toBeVisible()
  45  | })
  46  | 
  47  | test('[A2] clicking Add Another Receipt uploads a second PNG receipt', async ({ page }) => {
  48  |   await page.goto('/')
  49  |   await uploadReceipt(page, 'receipt1.jpg', 'image/jpeg', jpgBytes())
  50  |   await uploadReceipt(page, 'receipt2.png', 'image/png', pngBytes())
  51  |   const items = page.getByRole('listitem')
  52  |   await expect(items).toHaveCount(2)
  53  |   await expect(items.nth(1)).toContainText('Receipt 2')
  54  | })
  55  | 
  56  | test('[A3] Generate PDF with two receipts downloads a PDF containing both receipts and a cover sheet', async ({
  57  |   page,
  58  | }) => {
  59  |   await page.goto('/')
  60  |   await addTwoReceipts(page)
  61  |   const [download] = await Promise.all([
  62  |     page.waitForEvent('download'),
  63  |     page.getByRole('button', { name: 'Generate PDF' }).click(),
  64  |   ])
  65  |   const data = readFileSync((await download.path())!)
  66  |   expect(data.length, 'downloaded PDF is larger than 0 bytes').toBeGreaterThan(0)
  67  |   const body = data.toString('latin1')
  68  |   expect(body.startsWith('%PDF'), 'download is a PDF').toBe(true)
  69  |   // Two receipt pages plus a cover sheet.
  70  |   const pageCount = (body.match(/\/Type\s*\/Page[^s]/g) ?? []).length
  71  |   expect(pageCount, 'PDF has one page per receipt plus a cover sheet').toBe(3)
  72  | })
  73  | 
  74  | // A4: the cover sheet lists each receipt's date and amount "extracted from the
  75  | // image". The extracted date/amount values are not fixed by the spec, so the
  76  | // test asserts the cover sheet shows a per-receipt row with Date and Amount
  77  | // fields. The spec's own wording (A4 + Out of scope) fixes only that both
  78  | // fields are listed per receipt, not their values.
  79  | test('[A4] the cover sheet lists each receipt\'s date and amount', async ({ page }) => {
  80  |   await page.goto('/')
  81  |   await addTwoReceipts(page)
  82  |   const [download] = await Promise.all([
  83  |     page.waitForEvent('download'),
  84  |     page.getByRole('button', { name: 'Generate PDF' }).click(),
  85  |   ])
  86  |   const data = readFileSync((await download.path())!)
  87  |   const body = data.toString('latin1')
  88  |   // The cover sheet must name the two receipts and expose Date + Amount fields.
  89  |   expect(body).toContain('Receipt 1')
  90  |   expect(body).toContain('Receipt 2')
  91  |   expect(body).toMatch(/Date/i)
  92  |   expect(body).toMatch(/Amount/i)
  93  | })
  94  | 
  95  | test('[A5] the PDF is saved as Receipt Packet_2025-04-05.pdf', async ({ page }) => {
  96  |   await page.goto('/')
  97  |   await addTwoReceipts(page)
  98  |   const [download] = await Promise.all([
  99  |     page.waitForEvent('download'),
  100 |     page.getByRole('button', { name: 'Generate PDF' }).click(),
  101 |   ])
  102 |   expect(download.suggestedFilename()).toBe('Receipt Packet_2025-04-05.pdf')
  103 | })
  104 | 
  105 | test('[A6] Selecting Send to Expenses App shares the generated PDF', async ({ page }) => {
  106 |   await page.goto('/')
  107 |   await addTwoReceipts(page)
  108 |   // Generate so a PDF exists to send.
  109 |   await Promise.all([
  110 |     page.waitForEvent('download').then((d) => d.cancel().catch(() => {})),
  111 |     page.getByRole('button', { name: 'Generate PDF' }).click(),
  112 |   ])
  113 |   const [share] = await Promise.all([
  114 |     page.waitForEvent('framenavigated', (f) => f.url().startsWith('http://127.0.0.1/expenses')),
  115 |     page.getByRole('button', { name: 'Send to Expenses App' }).click(),
  116 |   ])
  117 |   expect(share.url()).toContain('expenses')
  118 |   // The PDF is attached: the share target references the receipt-packet PDF.
  119 |   expect(share.url()).toContain('Receipt%20Packet_2025-04-05.pdf')
  120 | })
  121 | 
  122 | // A7: "adjusts the image to the correct size" — the crop tool must change the
  123 | // displayed receipt's dimensions. The spec fixes the result ("correct size")
  124 | // not the exact pixel count, so the test asserts the dimensions label changes
  125 | // to the cropped region.
  126 | test('[A7] cropping a receipt with the on-screen tool adjusts the image size', async ({ page }) => {
  127 |   await page.goto('/')
  128 |   await uploadReceipt(page, 'receipt.jpg', 'image/jpeg', jpgBytes())
  129 |   const item = page.getByRole('listitem').filter({ hasText: 'Receipt 1' })
  130 |   await item.getByRole('button', { name: 'Crop' }).click()
  131 |   // Drag the bottom-right crop handle to the centre to halve the region.
  132 |   const canvas = page.locator('canvas').first()
  133 |   const box = (await canvas.boundingBox())!
  134 |   await page.mouse.move(box.x + box.width, box.y + box.height)
  135 |   await page.mouse.down()
  136 |   await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 })
  137 |   await page.mouse.up()
  138 |   await page.getByRole('button', { name: 'Apply crop' }).click()
  139 |   // After the crop the receipt entry shows a dimensions readout that differs
  140 |   // from the original full-size dimensions.
```