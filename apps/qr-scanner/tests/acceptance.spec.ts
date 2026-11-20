import { expect, test } from '@playwright/test'

test('[A1] with no scans or encodes, shows heading, "No results yet" and Scan/Encode tabs', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'QR Code Scanner' })).toBeVisible()
  await expect(page.getByText('No results yet')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Scan' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Encode' })).toBeVisible()
})

test('[A2] encoding "Hello" as a QR Code shows preview image with alt "QR Code: Hello" and a Download button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Encode' }).click()
  await page.getByLabel('Text').fill('Hello')
  await page.getByLabel('Format').selectOption({ label: 'QR Code' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('img', { name: 'QR Code: Hello' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible()
})

test('[A3] generating "Hello" as a QR Code and clicking Download downloads qr-hello.png', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Encode' }).click()
  await page.getByLabel('Text').fill('Hello')
  await page.getByLabel('Format').selectOption({ label: 'QR Code' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('qr-hello.png')
})

test('[A4] encoding "123456789012" as EAN-13 shows preview with alt "EAN-13: 1234567890128" (check digit computed)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Encode' }).click()
  await page.getByLabel('Text').fill('123456789012')
  await page.getByLabel('Format').selectOption({ label: 'EAN-13' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('img', { name: 'EAN-13: 1234567890128' })).toBeVisible()
})

test('[A5] encoding "ABC" as Code 128 shows preview with alt "Code 128: ABC"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Encode' }).click()
  await page.getByLabel('Text').fill('ABC')
  await page.getByLabel('Format').selectOption({ label: 'Code 128' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('img', { name: 'Code 128: ABC' })).toBeVisible()
})

test('[A6] uploading a QR image in the Scan tab shows a result containing "Test123" and "QR Code"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Upload image' }).click()
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test-qr.png',
    mimeType: 'image/png',
    buffer: await qrPng('Test123'),
  })
  const item = page.locator('li', { has: page.getByText('Test123') })
  await expect(item).toBeVisible()
  await expect(item.getByText('QR Code')).toBeVisible()
})

test('[A7] copying a scanned result copies "Test123" to the clipboard and shows a "Copied to clipboard" toast', async ({ page }) => {
  await page.goto('/')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Upload image' }).click()
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({
    name: 'test-qr.png',
    mimeType: 'image/png',
    buffer: await qrPng('Test123'),
  })
  const item = page.locator('li', { has: page.getByText('Test123') })
  await item.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Test123')
})

test('[A8] clicking Generate with an empty Text field shows "Enter text to encode" and no preview image', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Encode' }).click()
  await page.getByLabel('Text').fill('')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Enter text to encode')).toBeVisible()
  await expect(page.locator('img')).toHaveCount(0)
})

test('[A9] reloading keeps the generated QR Code "Hello" in the preview and in the result list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Encode' }).click()
  await page.getByLabel('Text').fill('Hello')
  await page.getByLabel('Format').selectOption({ label: 'QR Code' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('img', { name: 'QR Code: Hello' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('img', { name: 'QR Code: Hello' })).toBeVisible()
  const item = page.locator('li', { has: page.getByText('Hello') })
  await expect(item).toBeVisible()
})

// Encodes a small QR code (model 2, byte mode, version 1, ECC level L) to a
// PNG in pure JS so the Scan-tab tests have a real, decodable image.
async function qrPng(text: string): Promise<Buffer> {
  const data: number[] = []
  for (let i = 0; i < text.length; i++) data.push(text.charCodeAt(i))
  const bits: number[] = []
  const putBits = (v: number, n: number) => {
    for (let k = n - 1; k >= 0; k--) bits.push((v >>> k) & 1)
  }
  const dataCw = 13 // version 1, ECC L: 13 data codewords, 6 ecc
  putBits(0b0100, 4)
  putBits(data.length, 8)
  for (const b of data) putBits(b, 8)
  // terminator: up to 4 zero bits, not exceeding capacity
  const cap = 8 * dataCw
  putBits(0, Math.min(4, cap - bits.length))
  // pad to byte boundary
  while (bits.length % 8 !== 0) bits.push(0)
  // alternate pad bytes 0xEC / 0x11 to fill remaining codewords
  for (let pad = 0xec; bits.length < cap; pad = pad === 0xec ? 0x11 : 0xec) putBits(pad, 8)
  const rs = bitsToBytes(bits)
  const ecc = reedSolomon(rs, 6)
  const payload = rs.concat(ecc)
  const size = 21
  const mod: boolean[] = new Array(size * size).fill(false)
  const reserved: boolean[] = new Array(size * size).fill(false)
  const set = (x: number, y: number, v: boolean, isRes = false) => {
    mod[y * size + x] = v
    if (isRes) reserved[y * size + x] = true
  }
  const isReserved = (x: number, y: number) => reserved[y * size + x]
  const finder = (ox: number, oy: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const x = ox + c
        const y = oy + r
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        const dark =
          (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
          (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
          (r >= 2 && r <= 4 && c >= 2 && c <= 4)
        set(x, y, dark, true)
      }
    }
  }
  finder(0, 0)
  finder(size - 7, 0)
  finder(0, size - 7)
  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0, true)
    set(i, 6, i % 2 === 0, true)
  }
  const alignment = (cx: number, cy: number) => {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        set(cx + dx, cy + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1, true)
      }
    }
  }
  alignment(size - 7, size - 7)
  // version 1 carries no version info; expand each payload byte to 8 bits.
  const stream: number[] = []
  for (const b of payload) for (let k = 7; k >= 0; k--) stream.push((b >> k) & 1)
  let p = 0
  let up = true
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--
    for (let cnt = 0; cnt < size; cnt++) {
      const row = up ? size - 1 - cnt : cnt
      for (let c = 0; c < 2; c++) {
        const x = col - c
        if (!isReserved(x, row) && p < stream.length) {
          set(x, row, stream[p] === 1)
          p++
        }
      }
    }
    up = !up
  }
  const mask = (x: number, y: number) => (x + y) % 2 === 0
  let best = 0
  let bestPenalty = Infinity
  for (let m = 0; m < 8; m++) {
    const mfn = maskFns[m]
    let pen = 0
    const grid: boolean[] = []
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = mod[y * size + x] ^ (mfn(x, y) ? 1 : 0)
        grid.push(v)
      }
    }
    pen += penalty(grid, size)
    if (pen < bestPenalty) {
      bestPenalty = pen
      best = m
    }
  }
  const fmt = formatBits(0, best) // ECC L = 01, mask 3 bits
  const placeFmt = (bit: boolean, x: number, y: number) => set(x, y, bit)
  const f = [fmt[0], fmt[1], fmt[2], fmt[3], fmt[4], fmt[5], fmt[6], fmt[7]]
  // around top-left
  placeFmt(f[0], 8, 0)
  placeFmt(f[1], 8, 1)
  placeFmt(f[2], 8, 2)
  placeFmt(f[3], 8, 3)
  placeFmt(f[4], 8, 4)
  placeFmt(f[5], 8, 5)
  placeFmt(f[6], 8, 7)
  placeFmt(f[7], 8, 8)
  placeFmt(f[7], 7, 8)
  placeFmt(f[6], 5, 8)
  placeFmt(f[5], 4, 8)
  placeFmt(f[4], 3, 8)
  placeFmt(f[3], 2, 8)
  placeFmt(f[2], 1, 8)
  placeFmt(f[1], 0, 8)
  placeFmt(f[0], size - 8, size - 1)
  for (let i = 0; i < 7; i++) placeFmt(f[i], size - 1 - i, size - 8)
  const mfn = maskFns[best]
  const png: number[] = []
  const chunk = (type: string, bytes: number[]) => {
    const len = [0, 0, 0, 0]
    for (let i = 0; i < 4; i++) len[i] = (bytes.length >>> (24 - i * 8)) & 0xff
    const body = [...len, ...typeToBytes(type), ...bytes]
    const crc = crc32(body)
    png.push(...body, (crc >>> 24) & 0xff, (crc >>> 16) & 0xff, (crc >>> 8) & 0xff, crc & 0xff)
  }
  png.push(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
  chunk('IHDR', [
    0, 0, 0, size, 0, 0, 0, size, 8, 0, 0, 0, 0,
  ])
  const raw: number[] = []
  for (let y = 0; y < size; y++) {
    raw.push(0)
    for (let x = 0; x < size; x++) {
      const v = mod[y * size + x] ^ (mfn(x, y) && !isReserved(x, y) ? 1 : 0)
      raw.push(v ? 0 : 255)
    }
  }
  chunk('IDAT', deflate(raw))
  chunk('IEND', [])
  return Buffer.from(png)
}

const maskFns = [
  (x: number, y: number) => (x + y) % 2 === 0,
  (x: number, y: number) => y % 2 === 0,
  (x: number, y: number) => x % 3 === 0,
  (x: number, y: number) => (x + y) % 3 === 0,
  (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
]

function formatBits(ecc: number, mask: number): boolean[] {
  const d = ((ecc << 3) | mask) << 10
  let rem = d
  for (let i = 0; i < 10; i++) {
    rem = ((rem << 1) & 0x7ffff) ^ ((rem & 0x10000) ? 0x537 : 0)
  }
  const v = ((d << 10) | (rem & 0x3ff)) ^ 0x5412
  const out: boolean[] = []
  for (let k = 14; k >= 0; k--) out.push((v >>> k) & 1)
  return out
}

function reedSolomon(data: number[], eccLen: number): number[] {
  let gen = [1]
  for (let i = 0; i < eccLen; i++) {
    const next = new Array(gen.length + 1).fill(0)
    for (let j = 0; j < gen.length; j++) {
      next[j] ^= gen[j]
      next[j + 1] ^= gmul(gen[j], gexp[i])
    }
    gen = next
  }
  const res = new Array(eccLen).fill(0)
  for (const b of data) {
    const fb = b ^ res.shift() as number
    res.push(0)
    for (let j = 0; j < eccLen; j++) res[j] ^= gmul(gen[j + 1], fb)
  }
  return res
}

const gexp = new Array(512).fill(0)
const glog = new Array(256).fill(0)
{
  let x = 1
  for (let i = 0; i < 255; i++) {
    gexp[i] = x
    glog[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) gexp[i] = gexp[i - 255]
}
function gmul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return gexp[(glog[a] + glog[b]) % 255]
}

function bitsToBytes(bits: number[]): number[] {
  const out: number[] = []
  for (let i = 0; i + 7 < bits.length + 1; i += 8) {
    let b = 0
    for (let k = 0; k < 8; k++) b = (b << 1) | (bits[i + k] ?? 0)
    out.push(b)
  }
  return out
}

function penalty(grid: boolean[], size: number): number {
  let pen = 0
  for (let y = 0; y < size; y++) {
    let runX = 1
    let runY = 1
    for (let x = 1; x < size; x++) {
      runX = grid[y * size + x] === grid[y * size + x - 1] ? runX + 1 : 1
      if (runX === 5) pen++
      else if (runX > 5) pen++
    }
    for (let x = 1; x < size; x++) {
      runY = grid[y * size + x] === grid[(y - 1) * size + x] ? runY + 1 : 1
      if (runY === 5) pen++
      else if (runY > 5) pen++
    }
  }
  for (let y = 0; y < size - 1; y++) {
    for (let x = 0; x < size - 1; x++) {
      const c = grid[y * size + x]
      if (c === grid[y * size + x + 1] && c === grid[(y + 1) * size + x] && c === grid[(y + 1) * size + x + 1]) pen += 3
    }
  }
  const patternA = [true, false, true, true, true, false, true, false, false, false, false]
  const patternB = [...patternA].reverse()
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size - 10; x++) {
      let a = true
      let b = true
      for (let k = 0; k < 11; k++) {
        const v = grid[y * size + x + k]
        if (v !== patternA[k]) a = false
        if (v !== patternB[k]) b = false
      }
      if (a) pen += 40
      if (b) pen += 40
    }
  }
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size - 10; y++) {
      let a = true
      let b = true
      for (let k = 0; k < 11; k++) {
        const v = grid[(y + k) * size + x]
        if (v !== patternA[k]) a = false
        if (v !== patternB[k]) b = false
      }
      if (a) pen += 40
      if (b) pen += 40
    }
  }
  let dark = 0
  for (let i = 0; i < grid.length; i++) if (grid[i]) dark++
  const total = grid.length
  const pct = (dark * 100) / total
  const lower = Math.floor(pct / 10) * 10
  const upper = lower + 10
  pen += (Math.min(Math.abs(pct - lower), Math.abs(upper - pct)) / 10) * 10
  return pen
}

function typeToBytes(s: string): number[] {
  return [...s].map((c) => c.charCodeAt(0))
}

let crcTable: number[] | null = null
function crc32(bytes: number[]): number {
  if (!crcTable) {
    crcTable = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c
    }
  }
  let c = 0xffffffff
  for (const b of bytes) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function deflate(bytes: number[]): number[] {
  const store = bytes.length <= 65535
  const header = [0x78, 0x01]
  if (store) {
    const len = bytes.length
    const out = [...header, 0x01, len & 0xff, (len >>> 8) & 0xff, (~len) & 0xff, ((~len) >>> 8) & 0xff]
    out.push(...bytes)
    const adler = adler32(bytes)
    out.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff)
    return out
  }
  // stored blocks of 65535
  const out = [...header]
  for (let i = 0; i < bytes.length; i += 65535) {
    const chunk = bytes.slice(i, i + 65535)
    const last = i + 65535 >= bytes.length ? 1 : 0
    const len = chunk.length
    out.push(last, len & 0xff, (len >>> 8) & 0xff, (~len) & 0xff, ((~len) >>> 8) & 0xff)
    out.push(...chunk)
  }
  const adler = adler32(bytes)
  out.push((adler >>> 24) & 0xff, (adler >>> 16) & 0xff, (adler >>> 8) & 0xff, adler & 0xff)
  return out
}

function adler32(bytes: number[]): number {
  let a = 1
  let b = 0
  for (const x of bytes) {
    a = (a + x) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}
