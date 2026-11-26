# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/probe.spec.ts >> probe inflatePure
- Location: tests/probe.spec.ts:50:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | const RAW_IDAT = (() => {
  4   |   const W = 100, H = 50
  5   |   const raw = new Uint8Array((W * 3 + 1) * H)
  6   |   for (let y = 0; y < H; y++) {
  7   |     const row = y * (W * 3 + 1)
  8   |     for (let x = 0; x < W; x++) {
  9   |       const off = row + 1 + x * 3
  10  |       raw[off] = x < W / 2 ? 255 : 0
  11  |       raw[off + 1] = x < W / 2 ? 0 : 255
  12  |     }
  13  |   }
  14  |   let b64 = ''
  15  |   const bytes = Buffer.from(raw)
  16  |   return bytes.toString('base64')
  17  | })()
  18  | 
  19  | const pngB64 = (() => {
  20  |   const W = 100, H = 50
  21  |   const crcTable = new Int32Array(256)
  22  |   for (let n = 0; n < 256; n++) {
  23  |     let c = n
  24  |     for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  25  |     crcTable[n] = c
  26  |   }
  27  |   const crc = (buf: Buffer) => {
  28  |     let c = -1
  29  |     for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  30  |     return (c ^ -1) >>> 0
  31  |   }
  32  |   const chunk = (type: string, data: Buffer) => {
  33  |     const len = Buffer.alloc(4)
  34  |     len.writeUInt32BE(data.length)
  35  |     const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  36  |     const crcv = Buffer.alloc(4)
  37  |     crcv.writeUInt32BE(crc(body))
  38  |     return Buffer.concat([len, body, crcv])
  39  |   }
  40  |   const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  41  |   const ihdr = Buffer.alloc(13)
  42  |   ihdr.writeUInt32BE(W, 0)
  43  |   ihdr.writeUInt32BE(H, 4)
  44  |   ihdr[8] = 8
  45  |   ihdr[9] = 2
  46  |   const raw = Buffer.from(Buffer.from(RAW_IDAT, 'base64'))
  47  |   return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', raw), chunk('IEND', Buffer.alloc(0))]).toString('base64')
  48  | })()
  49  | 
  50  | test('probe inflatePure', async ({ page }) => {
> 51  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  52  |   const out = await page.evaluate(async ({ pngB64, rawB64 }) => {
  53  |     const results: Record<string, string> = {}
  54  |     // Step 1: confirm drawImage returns transparent pixels
  55  |     const img = new Image()
  56  |     const loaded = await new Promise<boolean>((res) => {
  57  |       img.onload = () => res(true)
  58  |       img.onerror = () => res(false)
  59  |       img.src = 'data:image/png;base64,' + pngB64
  60  |     })
  61  |     results.imgLoad = String(loaded)
  62  |     if (loaded) {
  63  |       const cv = document.createElement('canvas')
  64  |       cv.width = img.naturalWidth
  65  |       cv.height = img.naturalHeight
  66  |       const ctx = cv.getContext('2d') as CanvasRenderingContext2D
  67  |       ctx.drawImage(img, 0, 0)
  68  |       const data = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight).data
  69  |       let alpha0 = 0
  70  |       for (let i = 3; i < data.length; i += 4) if (data[i] === 0) alpha0++
  71  |       results.alpha0 = `${alpha0}/${data.length / 4}`
  72  |     }
  73  |     // Step 2: try DecompressionStream on the raw (non-zlib) IDAT payload
  74  |     try {
  75  |       const bytes = Uint8Array.from(atob(rawB64), c => c.charCodeAt(0))
  76  |       const ds = new DecompressionStream('deflate')
  77  |       const stream = new Blob([bytes]).stream().pipeThrough(ds)
  78  |       const reader = stream.getReader()
  79  |       const chunks: Uint8Array[] = []
  80  |       while (true) {
  81  |         const { value, done } = await reader.read()
  82  |         if (done) break
  83  |         if (value) chunks.push(value)
  84  |       }
  85  |       const total = chunks.reduce((s, c) => s + c.length, 0)
  86  |       results.decompressRaw = `ok total=${total}`
  87  |     } catch (e) {
  88  |       results.decompressRaw = `ERR: ${e instanceof Error ? e.message : String(e)}`
  89  |     }
  90  |     // Step 3: try DecompressionStream on a valid zlib stream (deflateSync of same bytes)
  91  |     try {
  92  |       // We can't call zlib.deflate in the browser, so skip — just note the type
  93  |       results.hasDecompressionStream = String(typeof DecompressionStream !== 'undefined')
  94  |     } catch {
  95  |       results.hasDecompressionStream = 'no'
  96  |     }
  97  |     return results
  98  |   }, { pngB64, rawB64: RAW_IDAT })
  99  |   console.log(JSON.stringify(out, null, 2))
  100 |   expect(true).toBe(true)
  101 | })
  102 | 
```