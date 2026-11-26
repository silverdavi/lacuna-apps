import { expect, test, type Page } from '@playwright/test'

import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const FIXTURES = join(tmpdir(), 'comic-reader-acceptance')

// test-comic.cbz: three solid-color PNG pages (red, green, blue), 60x80.
const P1 = 'iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAIAAADKqIEEAAAAYUlEQVR4nO3OAQkAIBAAsY/z/VMYyxieMFiAzdn9zjwfSIdJS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwd8mb5/BoMt1tB3FAAAAABJRU5ErkJggg=='
const P2 = 'iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAIAAADKqIEEAAAAYUlEQVR4nO3OAQkAIBAAsY/z/VMYyxieMFiAzZ79zjwfSIdJS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwd8mb7GUoMt1CjICQAAAABJRU5ErkJggg=='
const P3 = 'iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAIAAADKqIEEAAAAYUlEQVR4nO3OAQkAIBAAsY/z/VMYyxieMFiAze75zjwfSIdJS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwd8mb4NrYMtWI8T8wAAAABJRU5ErkJggg=='

const CRC_TABLE: number[] = (() => {
  const t: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(data: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function zipEntry(path: string, data: Buffer): Buffer {
  const name = Buffer.from(path)
  const header = Buffer.alloc(30)
  header.writeUInt32LE(0x04034b50, 0)
  header.writeUInt16LE(0, 6)
  header.writeUInt16LE(0, 8)
  header.writeUInt16LE(0, 10)
  header.writeUInt32LE(crc32(data), 14)
  header.writeUInt32LE(data.length, 18)
  header.writeUInt32LE(data.length, 22)
  header.writeUInt16LE(name.length, 26)
  return Buffer.concat([header, name, data])
}

function makeCbz(pages: string[]): Buffer {
  const parts: Buffer[] = []
  const central: Buffer[] = []
  let offset = 0
  pages.forEach((b64, i) => {
    const name = `page-${i + 1}.png`
    const data = Buffer.from(b64, 'base64')
    const entry = zipEntry(name, data)
    const c = Buffer.alloc(46)
    c.writeUInt32LE(0x02014b50, 0) // signature
    c.writeUInt16LE(0, 4) // made-by version
    c.writeUInt16LE(0, 6) // required version
    c.writeUInt16LE(0, 8) // flags
    c.writeUInt16LE(0, 10) // compression: stored
    c.writeUInt32LE(crc32(data), 14)
    c.writeUInt32LE(data.length, 18) // compressed size
    c.writeUInt32LE(data.length, 22) // uncompressed size
    c.writeUInt16LE(name.length, 26)
    c.writeUInt32LE(offset, 42) // local header offset
    central.push(Buffer.concat([c, Buffer.from(name)]))
    offset += entry.length
    parts.push(entry)
  })
  const cd = Buffer.concat(central)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(pages.length, 8)
  eocd.writeUInt16LE(pages.length, 10)
  eocd.writeUInt32LE(cd.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...parts, cd, eocd])
}

let cbzPath: string

test.beforeAll(() => {
  cbzPath = join(FIXTURES, 'test-comic.cbz')
  writeFileSync(cbzPath, makeCbz([P1, P2, P3]))
})

test.afterAll(() => {
  rmSync(FIXTURES, { recursive: true, force: true })
})

function loadComic(page: Page) {
  const drop = page.getByText('Drop a CBZ or CBR file here')
  return drop.setInputFiles(cbzPath)
}

test('[A1] shows the heading and drop zone text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Comic Book Reader' })).toBeVisible()
  await expect(page.getByText('Drop a CBZ or CBR file here')).toBeVisible()
})

test('[A2] dropping test-comic.cbz shows page 1 of 3', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await expect(page.getByRole('heading', { name: 'PagedReader' })).toBeVisible()
  await expect(page.getByText('1/3')).toBeVisible()
  const image = page.locator('img').first()
  await expect(image).toBeVisible()
  const src = await image.getAttribute('src')
  expect(src, 'page image is an image (data URL or object URL)').toMatch(/^(data:image|blob:)/)
})

test('[A3] Next page advances to page 2 and changes the image', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await expect(page.getByText('1/3')).toBeVisible()
  const firstSrc = await page.locator('img').first().getAttribute('src')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('2/3')).toBeVisible()
  const secondSrc = await page.locator('img').first().getAttribute('src')
  expect(secondSrc, 'page image changed to the second page').not.toBe(firstSrc)
})

test('[A4] Add bookmark on page 2 adds a "Page 2" entry', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await expect(page.getByText('Page 2')).toBeVisible()
})

test('[A5] Remove bookmark on "Page 2" empties the list', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await expect(page.getByText('Page 2')).toBeVisible()
  await page.getByRole('button', { name: 'Remove bookmark' }).click()
  await expect(page.getByText('No bookmarks yet')).toBeVisible()
})

test('[A6] Export page downloads test-comic-page-2.png', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('2/3')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export page' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('test-comic-page-2.png')
  const data = readFileSync((await download.path())!)
  expect(data.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
})

test('[A7] changing Page size to "Fit page" re-renders the image at a different scale', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  const image = page.locator('img').first()
  await expect(image).toBeVisible()
  const before = await image.evaluate((el) => {
    const box = (el as HTMLElement).getBoundingClientRect()
    return { width: box.width, height: box.height }
  })
  await page.getByLabel('Page size').selectOption({ label: 'Fit page' })
  await expect(page.getByLabel('Page size')).toHaveValue('Fit page')
  const after = await image.evaluate((el) => {
    const box = (el as HTMLElement).getBoundingClientRect()
    return { width: box.width, height: box.height }
  })
  expect(
    { ...after },
    'page image renders at a different scale under Fit page',
  ).not.toEqual(before)
})

test('[A8] Bookmarks tab shows a "Page 1" entry after adding a bookmark on page 1', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await expect(page.getByText('1/3')).toBeVisible()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByRole('tab', { name: 'Bookmarks' }).click()
  await expect(page.getByText('Page 1')).toBeVisible()
})

test('[A9] reload keeps the loaded file name and the "Page 1" bookmark', async ({ page }) => {
  await page.goto('/')
  await loadComic(page)
  await expect(page.getByText('test-comic.cbz')).toBeVisible()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByRole('tab', { name: 'Bookmarks' }).click()
  await expect(page.getByText('Page 1')).toBeVisible()
  await page.reload()
  await expect(page.getByText('test-comic.cbz')).toBeVisible()
  await page.getByRole('tab', { name: 'Bookmarks' }).click()
  await expect(page.getByText('Page 1')).toBeVisible()
})
