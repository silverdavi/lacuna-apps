import { test, type Page } from '@playwright/test'
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

async function loadImage(page: Page, name = 'test.png') {
  const dir = mkdtempSync(join(tmpdir(), 'flip-diag-'))
  const file = join(dir, name)
  writeFileSync(file, pngBuffer())
  await page.locator('input[type="file"]').first().setInputFiles(file)
}

// exact replica of canvasState from acceptance.spec.ts
async function canvasState(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return null
    const ctx = canvas.getContext('2d')
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let left = 0
    let right = 0
    let top = 0
    let bottom = 0
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r > g && r > b) left += 1
      else if (g > r && g > b) right += 1
    }
    // split into halves by scanning pixels in order
    const mid = Math.floor((width * height) / 2)
    for (let p = 0; p < width * height; p++) {
      const i = p * 4
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      if (r > g && r > b) p < mid ? (top += 1) : (bottom += 1)
      else if (g > r && g > b) p < mid ? (top += 1) : (bottom += 1)
    }
    return { width, height, left, right, top, bottom }
  })
}

test('D1 baseline (no transform)', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  const c = await canvasState(page)
  console.log('D1 baseline:', JSON.stringify(c))
})

test('D2 flipH', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await page.getByRole('button', { name: 'Flip H' }).click()
  const c = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const { data, width, height } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height)
    const px = (x: number, y: number) => {
      const i = (y * width + x) * 4
      return [data[i], data[i + 1], data[i + 2]]
    }
    let left = 0, right = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 1]) left++
      else if (data[i + 1] > data[i]) right++
    }
    return { width, height, p00: px(0, 0), p99_0: px(99, 0), p50_0: px(50, 0), left, right }
  })
  console.log('D2 flipH:', JSON.stringify(c))
})

test('D3 rotate90', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await page.getByRole('button', { name: 'Rotate 90°' }).click()
  const c = await canvasState(page)
  console.log('D3 rotate90:', JSON.stringify(c))
})

test('D4 flipH then rotate', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await page.getByRole('button', { name: 'Flip H' }).click()
  await page.getByRole('button', { name: 'Rotate 90°' }).click()
  const c = await canvasState(page)
  console.log('D4 flipH+rot:', JSON.stringify(c))
})
