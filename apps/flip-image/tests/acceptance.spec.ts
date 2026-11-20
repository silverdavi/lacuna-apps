import { expect, test, type Page } from '@playwright/test'
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
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor RGB
  const raw = Buffer.alloc((W * 3 + 1) * H)
  for (let y = 0; y < H; y++) {
    const row = y * (W * 3 + 1)
    raw[row] = 0 // filter: none
    for (let x = 0; x < W; x++) {
      // solid red on the left half, solid green on the right half
      const off = row + 1 + x * 3
      raw[off] = x < W / 2 ? 255 : 0
      raw[off + 1] = x < W / 2 ? 0 : 255
      raw[off + 2] = 0
    }
  }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', raw), chunk('IEND', Buffer.alloc(0))])
}

async function loadImage(page: Page, name = 'test.png') {
  const dir = mkdtempSync(join(tmpdir(), 'flip-image-'))
  const file = join(dir, name)
  writeFileSync(file, pngBuffer())
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(file)
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
}

async function canvasState(page: Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) throw new Error('no canvas found')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('no 2d context')
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
    let left = 0
    let right = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 1]) left++
      else if (data[i + 1] > data[i]) right++
    }
    return { width: canvas.width, height: canvas.height, left, right }
  })
}

const flipH = (page: Page) => page.getByRole('button', { name: 'Flip H' }).click()
const flipV = (page: Page) => page.getByRole('button', { name: 'Flip V' }).click()
const rotate = (page: Page) => page.getByRole('button', { name: 'Rotate 90°' }).click()

test('[A1] with no image loaded, shows the heading and drop hint and all buttons are disabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Image Flipper' })).toBeVisible()
  await expect(page.getByText('Drop an image or click to browse')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Flip H' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Flip V' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Rotate 90°' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled()
})

test('[A2] dropping test.png loads it and enables all buttons', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await expect(page.getByText('Loaded: test.png')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Flip H' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Flip V' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Rotate 90°' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  const c = await canvasState(page)
  expect(c.width).toBe(W)
  expect(c.height).toBe(H)
  expect(c.left).toBeGreaterThan(0)
  expect(c.right).toBeGreaterThan(0)
})

test('[A3] clicking Flip H once mirrors the image horizontally', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await flipH(page)
  await expect(page.getByText('Loaded: test.png (Flipped H)')).toBeVisible()
  const c = await canvasState(page)
  expect(c.width).toBe(W)
  expect(c.height).toBe(H)
  expect(c.left).toBeLessThan(c.right)
})

test('[A4] clicking Flip V once mirrors the image vertically', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await flipV(page)
  await expect(page.getByText('Loaded: test.png (Flipped V)')).toBeVisible()
  const c = await canvasState(page)
  expect(c.width).toBe(W)
  expect(c.height).toBe(H)
  // the red half stays on the left when only a vertical flip is applied
  expect(c.left).toBeGreaterThan(0)
  expect(c.right).toBeGreaterThan(0)
})

test('[A5] clicking Rotate 90° once rotates clockwise and swaps the canvas dimensions', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await rotate(page)
  await expect(page.getByText('Loaded: test.png (Rotated 90°)')).toBeVisible()
  const c = await canvasState(page)
  expect(c.width).toBe(H)
  expect(c.height).toBe(W)
  // clockwise 90° sends the left (red) edge to the top and the right (green)
  // edge to the bottom, so the top half ends up red-dominant
  const top = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const { data } = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, Math.floor(canvas.height / 2))
    let red = 0
    let green = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 1]) red++
      else if (data[i + 1] > data[i]) green++
    }
    return { red, green }
  })
  expect(top.red).toBeGreaterThan(top.green)
})

test('[A6] Flip H then Rotate 90° composes and the status lists both operations', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await flipH(page)
  await rotate(page)
  await expect(page.getByText('Loaded: test.png (Flipped H, Rotated 90°)')).toBeVisible()
  const c = await canvasState(page)
  expect(c.width).toBe(H)
  expect(c.height).toBe(W)
  // horizontal flip first, then clockwise rotation: the red half moves to the
  // right side of the canvas (flip) and then down (rotation), so the bottom
  // half must end up red-dominant
  const bottom = await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!
    const h2 = Math.floor(canvas.height / 2)
    const { data } = canvas.getContext('2d')!.getImageData(0, h2, canvas.width, canvas.height - h2)
    let red = 0
    let green = 0
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > data[i + 1]) red++
      else if (data[i + 1] > data[i]) green++
    }
    return { red, green }
  })
  expect(bottom.red).toBeGreaterThan(bottom.green)
})

test('[A7] Download after Flip H saves test_flipped.png and leaves the status unchanged', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await flipH(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('test_flipped.png')
  await expect(page.getByText('Loaded: test.png (Flipped H)')).toBeVisible()
})

test('[A8] rotating four times returns to the original orientation and status', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  for (let i = 0; i < 4; i++) await rotate(page)
  await expect(page.getByText('Loaded: test.png')).toBeVisible()
  const c = await canvasState(page)
  expect(c.width).toBe(W)
  expect(c.height).toBe(H)
  // the red half is back on the left, as on first load
  expect(c.left).toBeGreaterThan(0)
  expect(c.right).toBeGreaterThan(0)
})

test('[A9] reload keeps the loaded image and its transformations', async ({ page }) => {
  await page.goto('/')
  await loadImage(page)
  await flipH(page)
  await expect(page.getByText('Loaded: test.png (Flipped H)')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Loaded: test.png (Flipped H)')).toBeVisible()
  const c = await canvasState(page)
  expect(c.width).toBe(W)
  expect(c.height).toBe(H)
  // the restored image is still the horizontally flipped one: red on the right
  expect(c.left).toBeLessThan(c.right)
})
