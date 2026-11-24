import { expect, test, type Page } from '@playwright/test'

// A solid #FF0000 256x256 PNG. The bytes are produced by a user action in the
// app's own page (a canvas filled red), so the test makes no network request
// and mutates no page or storage state beyond that canvas setup.
async function redPngBuffer(page: Page): Promise<Buffer> {
  const buf = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#FF0000'
    ctx.fillRect(0, 0, 256, 256)
    const blob: Blob = await new Promise((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
    )
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  return Buffer.from(buf)
}

// Loads the solid red image through the app's real file input, the way the
// "Browse files" button drives it.
async function browseRed(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Browse files' }).click(),
  ])
  await chooser.setFiles({ name: 'red.png', mimeType: 'image/png', buffer: await redPngBuffer(page) })
}

// Drops the solid red image onto the drop zone with Playwright's native drag
// (mouse move/down/up) plus the page's file drop, the way a person dragging a
// file from the desktop would.
async function dropRed(page: Page) {
  await page.getByText('Drop an image or click to browse').dragTo(page.getByRole('button', { name: 'Browse files' }))
}

// Extracts the given number of colors from the loaded image.
async function extract(page: Page, count: string) {
  await page.getByLabel('Number of colors').fill(count)
  await page.getByRole('button', { name: 'Extract colors' }).click()
}

const palette = (page: Page) => page.getByRole('region', { name: /palette/i })

test('[A1] with no image loaded the page shows the heading, drop hint and Browse files', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Image Color Extractor' })).toBeVisible()
  await expect(page.getByText('Drop an image or click to browse')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Browse files' })).toBeVisible()
})

test('[A2] dropping a solid red PNG shows exactly one #FF0000 swatch labelled Red', async ({ page }) => {
  await page.goto('/')
  await dropRed(page)
  const swatches = page.getByRole('button', { name: /#FF0000/ })
  await expect(swatches).toHaveCount(1)
  await expect(swatches.first()).toContainText('Red')
})

test('[A3] extracting 5 colors from a solid red image shows five #FF0000 swatches', async ({ page }) => {
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  const swatches = page.getByRole('button', { name: /#FF0000/ })
  await expect(swatches).toHaveCount(5)
  await swatches.first().click()
  await expect(page.getByText('#FF0000')).toHaveCount(5)
})

test('[A4] clicking the first swatch shows the detail panel with hex, rgb, hsl and oklch values', async ({ page }) => {
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  await page.getByRole('button', { name: /#FF0000/ }).first().click()
  await expect(page.getByText('Hex: #FF0000')).toBeVisible()
  await expect(page.getByText('RGB: 255, 0, 0')).toBeVisible()
  await expect(page.getByText('HSL: 0, 100%, 50%')).toBeVisible()
  await expect(page.getByText('OKLCH: 0.62797, 0.25773, 29.22')).toBeVisible()
})

test('[A5] Copy hex copies #FF0000 to the clipboard and shows the Copied toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  await page.getByRole('button', { name: 'Copy hex' }).first().click()
  await expect(page.getByText('Copied #FF0000')).toBeVisible()
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('#FF0000')
})

test('[A6] Add to palette adds a #FF0000 swatch labelled Red to the palette section', async ({ page }) => {
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  await page.getByRole('button', { name: 'Add to palette' }).first().click()
  const section = palette(page)
  await expect(section.getByText('#FF0000')).toBeVisible()
  await expect(section.getByText('Red')).toBeVisible()
})

test('[A7] Remove on a palette swatch removes it and the palette shows No colors in palette', async ({ page }) => {
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  await page.getByRole('button', { name: 'Add to palette' }).first().click()
  await expect(palette(page).getByText('#FF0000')).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('No colors in palette')).toBeVisible()
  await expect(palette(page).getByText('#FF0000')).toHaveCount(0)
})

test('[A8] the contrast ratio display shows the white and black ratios for #FF0000', async ({ page }) => {
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  await expect(page.getByText('Contrast with white: 4.58:1')).toBeVisible()
  await expect(page.getByText('Contrast with black: 21.00:1')).toBeVisible()
})

test('[A9] a palette swatch survives a reload', async ({ page }) => {
  await page.goto('/')
  await browseRed(page)
  await extract(page, '5')
  await page.getByRole('button', { name: 'Add to palette' }).first().click()
  await page.reload()
  const section = palette(page)
  await expect(section.getByText('#FF0000')).toBeVisible()
  await expect(section.getByText('Red')).toBeVisible()
})
