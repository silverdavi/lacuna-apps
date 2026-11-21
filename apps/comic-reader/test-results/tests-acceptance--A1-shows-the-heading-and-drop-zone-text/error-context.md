# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] shows the heading and drop zone text
- Location: tests/acceptance.spec.ts:93:1

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
  3   | import { readFileSync, rmSync, writeFileSync } from 'node:fs'
  4   | import { tmpdir } from 'node:os'
  5   | import { join } from 'node:path'
  6   | 
  7   | const FIXTURES = join(tmpdir(), 'comic-reader-acceptance')
  8   | 
  9   | // test-comic.cbz: three solid-color PNG pages (red, green, blue), 60x80.
  10  | const P1 = 'iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAIAAADKqIEEAAAAYUlEQVR4nO3OAQkAIBAAsY/z/VMYyxieMFiAzdn9zjwfSIdJS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwd8mb5/BoMt1tB3FAAAAABJRU5ErkJggg=='
  11  | const P2 = 'iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAIAAADKqIEEAAAAYUlEQVR4nO3OAQkAIBAAsY/z/VMYyxieMFiAzZ79zjwfSIdJS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwd8mb7GUoMt1CjICQAAAABJRU5ErkJggg=='
  12  | const P3 = 'iVBORw0KGgoAAAANSUhEUgAAADwAAABQCAIAAADKqIEEAAAAYUlEQVR4nO3OAQkAIBAAsY/z/VMYyxieMFiAze75zjwfSIdJS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwdIS0sHSEtLB0hLSwd8mb4NrYMtWI8T8wAAAABJRU5ErkJggg=='
  13  | 
  14  | const CRC_TABLE: number[] = (() => {
  15  |   const t: number[] = []
  16  |   for (let n = 0; n < 256; n++) {
  17  |     let c = n
  18  |     for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  19  |     t[n] = c >>> 0
  20  |   }
  21  |   return t
  22  | })()
  23  | 
  24  | function crc32(data: Buffer): number {
  25  |   let crc = 0xffffffff
  26  |   for (let i = 0; i < data.length; i++) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  27  |   return (crc ^ 0xffffffff) >>> 0
  28  | }
  29  | 
  30  | function zipEntry(path: string, data: Buffer): Buffer {
  31  |   const name = Buffer.from(path)
  32  |   const header = Buffer.alloc(30)
  33  |   header.writeUInt32LE(0x04034b50, 0)
  34  |   header.writeUInt16LE(0, 6)
  35  |   header.writeUInt16LE(0, 8)
  36  |   header.writeUInt16LE(0, 10)
  37  |   header.writeUInt32LE(crc32(data), 14)
  38  |   header.writeUInt32LE(data.length, 18)
  39  |   header.writeUInt32LE(data.length, 22)
  40  |   header.writeUInt16LE(name.length, 26)
  41  |   return Buffer.concat([header, name, data])
  42  | }
  43  | 
  44  | function makeCbz(pages: string[]): Buffer {
  45  |   const parts: Buffer[] = []
  46  |   const central: Buffer[] = []
  47  |   let offset = 0
  48  |   pages.forEach((b64, i) => {
  49  |     const name = `page-${i + 1}.png`
  50  |     const data = Buffer.from(b64, 'base64')
  51  |     const entry = zipEntry(name, data)
  52  |     const c = Buffer.alloc(46)
  53  |     c.writeUInt32LE(0x02014b50, 0) // signature
  54  |     c.writeUInt16LE(0, 4) // made-by version
  55  |     c.writeUInt16LE(0, 6) // required version
  56  |     c.writeUInt16LE(0, 8) // flags
  57  |     c.writeUInt16LE(0, 10) // compression: stored
  58  |     c.writeUInt32LE(crc32(data), 14)
  59  |     c.writeUInt32LE(data.length, 18) // compressed size
  60  |     c.writeUInt32LE(data.length, 22) // uncompressed size
  61  |     c.writeUInt16LE(name.length, 26)
  62  |     c.writeUInt32LE(offset, 42) // local header offset
  63  |     central.push(Buffer.concat([c, Buffer.from(name)]))
  64  |     offset += entry.length
  65  |     parts.push(entry)
  66  |   })
  67  |   const cd = Buffer.concat(central)
  68  |   const eocd = Buffer.alloc(22)
  69  |   eocd.writeUInt32LE(0x06054b50, 0)
  70  |   eocd.writeUInt16LE(pages.length, 8)
  71  |   eocd.writeUInt16LE(pages.length, 10)
  72  |   eocd.writeUInt32LE(cd.length, 12)
  73  |   eocd.writeUInt32LE(offset, 16)
  74  |   return Buffer.concat([...parts, cd, eocd])
  75  | }
  76  | 
  77  | let cbzPath: string
  78  | 
  79  | test.beforeAll(() => {
  80  |   cbzPath = join(FIXTURES, 'test-comic.cbz')
  81  |   writeFileSync(cbzPath, makeCbz([P1, P2, P3]))
  82  | })
  83  | 
  84  | test.afterAll(() => {
  85  |   rmSync(FIXTURES, { recursive: true, force: true })
  86  | })
  87  | 
  88  | function loadComic(page: Page) {
  89  |   const drop = page.getByText('Drop a CBZ or CBR file here')
  90  |   return drop.setInputFiles(cbzPath)
  91  | }
  92  | 
  93  | test('[A1] shows the heading and drop zone text', async ({ page }) => {
> 94  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  95  |   await expect(page.getByRole('heading', { name: 'Comic Book Reader' })).toBeVisible()
  96  |   await expect(page.getByText('Drop a CBZ or CBR file here')).toBeVisible()
  97  | })
  98  | 
  99  | test('[A2] dropping test-comic.cbz shows page 1 of 3', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await loadComic(page)
  102 |   await expect(page.getByRole('heading', { name: 'PagedReader' })).toBeVisible()
  103 |   await expect(page.getByText('1/3')).toBeVisible()
  104 |   const image = page.locator('img').first()
  105 |   await expect(image).toBeVisible()
  106 |   const src = await image.getAttribute('src')
  107 |   expect(src, 'page image is an image (data URL or object URL)').toMatch(/^(data:image|blob:)/)
  108 | })
  109 | 
  110 | test('[A3] Next page advances to page 2 and changes the image', async ({ page }) => {
  111 |   await page.goto('/')
  112 |   await loadComic(page)
  113 |   await expect(page.getByText('1/3')).toBeVisible()
  114 |   const firstSrc = await page.locator('img').first().getAttribute('src')
  115 |   await page.getByRole('button', { name: 'Next page' }).click()
  116 |   await expect(page.getByText('2/3')).toBeVisible()
  117 |   const secondSrc = await page.locator('img').first().getAttribute('src')
  118 |   expect(secondSrc, 'page image changed to the second page').not.toBe(firstSrc)
  119 | })
  120 | 
  121 | test('[A4] Add bookmark on page 2 adds a "Page 2" entry', async ({ page }) => {
  122 |   await page.goto('/')
  123 |   await loadComic(page)
  124 |   await page.getByRole('button', { name: 'Next page' }).click()
  125 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  126 |   await expect(page.getByText('Page 2')).toBeVisible()
  127 | })
  128 | 
  129 | test('[A5] Remove bookmark on "Page 2" empties the list', async ({ page }) => {
  130 |   await page.goto('/')
  131 |   await loadComic(page)
  132 |   await page.getByRole('button', { name: 'Next page' }).click()
  133 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  134 |   await expect(page.getByText('Page 2')).toBeVisible()
  135 |   await page.getByRole('button', { name: 'Remove bookmark' }).click()
  136 |   await expect(page.getByText('No bookmarks yet')).toBeVisible()
  137 | })
  138 | 
  139 | test('[A6] Export page downloads test-comic-page-2.png', async ({ page }) => {
  140 |   await page.goto('/')
  141 |   await loadComic(page)
  142 |   await page.getByRole('button', { name: 'Next page' }).click()
  143 |   await expect(page.getByText('2/3')).toBeVisible()
  144 |   const [download] = await Promise.all([
  145 |     page.waitForEvent('download'),
  146 |     page.getByRole('button', { name: 'Export page' }).click(),
  147 |   ])
  148 |   expect(download.suggestedFilename()).toBe('test-comic-page-2.png')
  149 |   const data = readFileSync((await download.path())!)
  150 |   expect(data.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  151 | })
  152 | 
  153 | test('[A7] changing Page size to "Fit page" re-renders the image at a different scale', async ({ page }) => {
  154 |   await page.goto('/')
  155 |   await loadComic(page)
  156 |   const image = page.locator('img').first()
  157 |   await expect(image).toBeVisible()
  158 |   const before = await image.evaluate((el) => {
  159 |     const box = (el as HTMLElement).getBoundingClientRect()
  160 |     return { width: box.width, height: box.height }
  161 |   })
  162 |   await page.getByLabel('Page size').selectOption({ label: 'Fit page' })
  163 |   await expect(page.getByLabel('Page size')).toHaveValue('Fit page')
  164 |   const after = await image.evaluate((el) => {
  165 |     const box = (el as HTMLElement).getBoundingClientRect()
  166 |     return { width: box.width, height: box.height }
  167 |   })
  168 |   expect(
  169 |     { ...after },
  170 |     'page image renders at a different scale under Fit page',
  171 |   ).not.toEqual(before)
  172 | })
  173 | 
  174 | test('[A8] Bookmarks tab shows a "Page 1" entry after adding a bookmark on page 1', async ({ page }) => {
  175 |   await page.goto('/')
  176 |   await loadComic(page)
  177 |   await expect(page.getByText('1/3')).toBeVisible()
  178 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  179 |   await page.getByRole('tab', { name: 'Bookmarks' }).click()
  180 |   await expect(page.getByText('Page 1')).toBeVisible()
  181 | })
  182 | 
  183 | test('[A9] reload keeps the loaded file name and the "Page 1" bookmark', async ({ page }) => {
  184 |   await page.goto('/')
  185 |   await loadComic(page)
  186 |   await expect(page.getByText('test-comic.cbz')).toBeVisible()
  187 |   await page.getByRole('button', { name: 'Add bookmark' }).click()
  188 |   await page.getByRole('tab', { name: 'Bookmarks' }).click()
  189 |   await expect(page.getByText('Page 1')).toBeVisible()
  190 |   await page.reload()
  191 |   await expect(page.getByText('test-comic.cbz')).toBeVisible()
  192 |   await page.getByRole('tab', { name: 'Bookmarks' }).click()
  193 |   await expect(page.getByText('Page 1')).toBeVisible()
  194 | })
```