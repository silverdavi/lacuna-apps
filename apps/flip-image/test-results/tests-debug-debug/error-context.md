# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/debug.spec.ts >> debug
- Location: tests/debug.spec.ts:19:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test'
  2  | import { mkdtempSync, writeFileSync } from 'node:fs'
  3  | import { tmpdir } from 'node:os'
  4  | import { join } from 'node:path'
  5  | const W=100,H=50
  6  | function pngBuffer(): Buffer {
  7  |   const crcTable = new Int32Array(256)
  8  |   for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c }
  9  |   const crc = (buf: Buffer) => { let c = -1; for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0 }
  10 |   const chunk = (type: string, data: Buffer) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const body = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crcv = Buffer.alloc(4); crcv.writeUInt32BE(crc(body)); return Buffer.concat([len, body, crcv]) }
  11 |   const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  12 |   const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 2
  13 |   const raw = Buffer.alloc((W * 3 + 1) * H)
  14 |   for (let y = 0; y < H; y++) { const row = y * (W * 3 + 1); raw[row] = 0; for (let x = 0; x < W; x++) { const off = row + 1 + x * 3; raw[off] = x < W / 2 ? 255 : 0; raw[off + 1] = x < W / 2 ? 0 : 255; raw[off + 2] = 0 } }
  15 |   return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', raw), chunk('IEND', Buffer.alloc(0))])
  16 | }
  17 | async function loadImage(page: Page) { const dir = mkdtempSync(join(tmpdir(), 'flip-image-')); const file = join(dir, 'test.png'); writeFileSync(file, pngBuffer()); const input = page.locator('input[type="file"]').first(); await input.setInputFiles(file) }
  18 | async function canvasState(page: Page) { return page.evaluate(() => { const canvas = document.querySelector('canvas')!; const ctx = canvas.getContext('2d')!; const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height); let left = 0, right = 0; for (let i = 0; i < data.length; i += 4) { if (data[i] > data[i + 1]) left++; else if (data[i + 1] > data[i]) right++ } return { width: canvas.width, height: canvas.height, left, right } }) }
  19 | test('debug', async ({ page }) => {
> 20 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  21 |   await loadImage(page)
  22 |   console.log('INITIAL', JSON.stringify(await canvasState(page)))
  23 |   await page.getByRole('button', { name: 'Flip H' }).click()
  24 |   console.log('AFTER FLIPH', JSON.stringify(await canvasState(page)))
  25 |   await page.getByRole('button', { name: 'Flip H' }).click()
  26 |   console.log('AFTER FLIPH2', JSON.stringify(await canvasState(page)))
  27 | })
  28 | 
```