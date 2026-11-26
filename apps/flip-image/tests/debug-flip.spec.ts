import { expect, test } from '@playwright/test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const W = 100
const H = 50

function pngBuffer(): Buffer {
  const crcTable = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crcTable[n] = c
  }
  const crc = (buf: Buffer) => {
    let c = -1
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ -1) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crcv = Buffer.alloc(4)
    crcv.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, crcv])
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0)
  ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const raw = Buffer.alloc((W * 3 + 1) * H)
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1)
    raw[row] = 0
    for (let x = 0; x < W; x++) {
      const off = row + 1 + x * 3
      raw[off] = x < W / 2 ? 255 : 0
      raw[off + 1] = x < W / 2 ? 0 : 255
      raw[off + 2] = 0
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', raw), chunk('IEND', Buffer.alloc(0))])
}

test('debug canvas pixels', async ({ page }) => {
  const logs: string[] = []
  page.on('console', (msg) => logs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`))

  const dir = mkdtempSync(join(tmpdir(), 'flip-image-'))
  const file = join(dir, 'test.png')
  writeFileSync(file, pngBuffer())
  await page.goto('/')
  await page.locator('input[type="file"]').first().setInputFiles(file)
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()

  const before = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let nonZero = 0
    let red = 0
    let green = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 0 || data[i + 1] !== 0 || data[i + 2] !== 0 || data[i + 3] !== 0) nonZero++
      if (data[i] > data[i + 1]) red++
      else if (data[i + 1] > data[i]) green++
    }
    return {
      w: canvas.width,
      h: canvas.height,
      nonZero,
      red,
      green,
      firstPx: Array.from(data.subarray(0, 4)),
      midPx: Array.from(data.subarray((canvas.width * 25 + 50) * 4, (canvas.width * 25 + 50) * 4 + 4)),
      ls: JSON.stringify(window.localStorage.getItem('lacuna.flip-image.session'))?.slice(0, 200),
    }
  })
  console.log('BEFORE FLIP:', JSON.stringify(before, null, 2))
  console.log('PAGE LOGS:', logs.join('\n'))

  await page.getByRole('button', { name: 'Flip H' }).click()
  await expect(page.getByText('Loaded: test.png (Flipped H)')).toBeVisible()

  const after = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const ctx = canvas.getContext('2d')!
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const row = Math.floor(canvas.height / 2) * canvas.width
    let left = 0
    let right = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 1]) left++
      else if (data[i + 1] > data[i]) right++
    }
    return {
      w: canvas.width,
      h: canvas.height,
      left,
      right,
      leftPx: Array.from(data.subarray(row * 4 + 10 * 4, row * 4 + 10 * 4 + 4)),
      rightPx: Array.from(data.subarray(row * 4 + 90 * 4, row * 4 + 90 * 4 + 4)),
    }
  })
  console.log('AFTER FLIP:', JSON.stringify(after, null, 2))
  expect(after.left).toBeLessThan(after.right)
})
