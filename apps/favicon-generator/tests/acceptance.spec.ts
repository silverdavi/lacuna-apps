import { expect, test } from '@playwright/test'
import { deflateSync } from 'node:zlib'

function crc32(buf: Buffer) {
  let r = 0xffffffff
  for (const b of buf) {
    let c = (r ^ b) & 255
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    r = c ^ (r >>> 8)
  }
  return (r ^ 0xffffffff) >>> 0
}

function chunk(type: string, data: Buffer) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}

function solidPng(size: number) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 2
  const row = Buffer.alloc(1 + size * 3)
  for (let x = 0; x < size; x++) {
    row[1 + x * 3] = 200
    row[2 + x * 3] = 60
    row[3 + x * 3] = 40
  }
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function loadLogo(page: import('@playwright/test').Page) {
  const dropZone = page.getByText('Drop an image or click to browse')
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), dropZone.click()])
  await chooser.setFiles({ name: 'logo.png', mimeType: 'image/png', buffer: solidPng(512) })
}

test('[A1] page heading is Favicon Generator', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Favicon Generator' })).toBeVisible()
})

test('[A2] drop zone shows instruction text with no image loaded', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Drop an image or click to browse')).toBeVisible()
})

test('[A3] loading logo.png shows the file name and eight generated sizes', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await expect(page.getByRole('region', { name: 'Preview' }).getByText('logo.png')).toBeVisible()
  const items = page.getByRole('list', { name: 'Generated sizes' }).getByRole('listitem')
  await expect(items).toHaveCount(8)
  for (const size of ['16x16', '32x32', '48x48', '64x64', '128x128', '192x192', '256x256', '512x512']) {
    await expect(items.getByText(size, { exact: true })).toBeVisible()
  }
})

test('[A4] selecting Square and applying keeps the preview and eight sizes', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.getByLabel('Crop shape').selectOption({ label: 'Square' })
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('region', { name: 'Preview' }).getByText('logo.png')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Generated sizes' }).getByRole('listitem')).toHaveCount(8)
})

test('[A5] selecting Circle and applying keeps the preview and eight sizes', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.getByLabel('Crop shape').selectOption({ label: 'Circle' })
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('region', { name: 'Preview' }).getByText('logo.png')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Generated sizes' }).getByRole('listitem')).toHaveCount(8)
})

test('[A6] setting Quality to 80 and applying keeps the preview and eight sizes', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.getByLabel('Quality').fill('80')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('region', { name: 'Preview' }).getByText('logo.png')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Generated sizes' }).getByRole('listitem')).toHaveCount(8)
})

test('[A7] Download all triggers a download named favicons.zip', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download all' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('favicons.zip')
})

test('[A8] Download 16x16 triggers a download named favicon-16x16.png', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('list', { name: 'Generated sizes' }).getByRole('button', { name: 'Download 16x16' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('favicon-16x16.png')
})

test('[A9] preview and size list survive a reload after loading logo.png', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Preview' }).getByText('logo.png')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Generated sizes' }).getByRole('listitem').getByText('16x16', { exact: true })).toBeVisible()
})
