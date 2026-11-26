# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/debug-flip.spec.ts >> debug canvas pixels
- Location: tests/debug-flip.spec.ts:49:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | import { mkdtempSync, writeFileSync } from 'node:fs'
  3   | import { tmpdir } from 'node:os'
  4   | import { join } from 'node:path'
  5   | 
  6   | const W = 100
  7   | const H = 50
  8   | 
  9   | function pngBuffer(): Buffer {
  10  |   const crcTable = new Int32Array(256)
  11  |   for (let n = 0; n < 256; n++) {
  12  |     let c = n
  13  |     for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  14  |     crcTable[n] = c
  15  |   }
  16  |   const crc = (buf: Buffer) => {
  17  |     let c = -1
  18  |     for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  19  |     return (c ^ -1) >>> 0
  20  |   }
  21  |   const chunk = (type: string, data: Buffer) => {
  22  |     const len = Buffer.alloc(4)
  23  |     len.writeUInt32BE(data.length)
  24  |     const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  25  |     const crcv = Buffer.alloc(4)
  26  |     crcv.writeUInt32BE(crc(body))
  27  |     return Buffer.concat([len, body, crcv])
  28  |   }
  29  |   const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  30  |   const ihdr = Buffer.alloc(13)
  31  |   ihdr.writeUInt32BE(W, 0)
  32  |   ihdr.writeUInt32BE(H, 4)
  33  |   ihdr[8] = 8
  34  |   ihdr[9] = 2
  35  |   const raw = Buffer.alloc((W * 3 + 1) * H)
  36  |   for (let y = 0; y < H; y++) {
  37  |     const row = y * (W * 3 + 1)
  38  |     raw[row] = 0
  39  |     for (let x = 0; x < W; x++) {
  40  |       const off = row + 1 + x * 3
  41  |       raw[off] = x < W / 2 ? 255 : 0
  42  |       raw[off + 1] = x < W / 2 ? 0 : 255
  43  |       raw[off + 2] = 0
  44  |     }
  45  |   }
  46  |   return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', raw), chunk('IEND', Buffer.alloc(0))])
  47  | }
  48  | 
  49  | test('debug canvas pixels', async ({ page }) => {
  50  |   const logs: string[] = []
  51  |   page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
  52  |   page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))
  53  | 
  54  |   const dir = mkdtempSync(join(tmpdir(), 'flip-image-'))
  55  |   const file = join(dir, 'test.png')
  56  |   writeFileSync(file, pngBuffer())
> 57  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  58  |   await page.locator('input[type="file"]').first().setInputFiles(file)
  59  |   await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  60  | 
  61  |   const before = await page.evaluate(() => {
  62  |     const canvas = document.querySelector('canvas')!
  63  |     const ctx = canvas.getContext('2d')!
  64  |     const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  65  |     let nonZero = 0
  66  |     let red = 0
  67  |     let green = 0
  68  |     for (let i = 0; i < data.length; i += 4) {
  69  |       if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0 || data[i + 3] !== 0) nonZero++
  70  |       if (data[i] > data[i + 1]) red++
  71  |       else if (data[i + 1] > data[i]) green++
  72  |     }
  73  |     return {
  74  |       w: canvas.width,
  75  |       h: canvas.height,
  76  |       nonZero,
  77  |       red,
  78  |       green,
  79  |       firstPx: Array.from(data.subarray(0, 4)),
  80  |       midPx: Array.from(data.subarray((canvas.width * 25 + 50) * 4, (canvas.width * 25 + 50) * 4 + 4)),
  81  |       ls: JSON.stringify(window.localStorage.getItem('lacuna.flip-image.session'))?.slice(0, 200),
  82  |     }
  83  |   })
  84  |   console.log('BEFORE FLIP:', JSON.stringify(before, null, 2))
  85  |   console.log('PAGE LOGS:', logs.join('\n'))
  86  | 
  87  |   await page.getByRole('button', { name: 'Flip H' }).click()
  88  |   await expect(page.getByText('Loaded: test.png (Flipped H)')).toBeVisible()
  89  | 
  90  |   const after = await page.evaluate(() => {
  91  |     const canvas = document.querySelector('canvas')!
  92  |     const ctx = canvas.getContext('2d')!
  93  |     const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
  94  |     const row = Math.floor(canvas.height / 2) * canvas.width
  95  |     let left = 0
  96  |     let right = 0
  97  |     for (let i = 0; i < data.length; i += 4) {
  98  |       if (data[i] > data[i + 1]) left++
  99  |       else if (data[i + 1] > data[i]) right++
  100 |     }
  101 |     return {
  102 |       w: canvas.width,
  103 |       h: canvas.height,
  104 |       left,
  105 |       right,
  106 |       leftPx: Array.from(data.subarray(row * 4 + 10 * 4, row * 4 + 10 * 4 + 4)),
  107 |       rightPx: Array.from(data.subarray(row * 4 + 90 * 4, row * 4 + 90 * 4 + 4)),
  108 |     }
  109 |   })
  110 |   console.log('AFTER FLIP:', JSON.stringify(after, null, 2))
  111 | })
  112 | 
```