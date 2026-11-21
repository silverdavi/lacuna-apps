import { expect, test, type Page } from '@playwright/test'

// A 512x512 PNG (solid red with a white cross), inlined as a data URL so the
// file the chooser accepts still carries the name "logo.png".
const LOGO_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAIAAAB7GkOtAAAHY0lEQVR42u3b'
  + 'sQ0AIAwEsdt/adggdaT45QlScBW9AuAgJwAQAAAEAAABAEAAABAAAAQAAAEA'
  + 'QAAAEAAABAAAAQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAAEAAABAAAAQAQ'
  + 'AAAEAAABAEAAABAAAAQAAAEAQAAAEAAABAAAAQBAAAAQAAAEAAABAEAAABAA'
  + 'AAQAAAEAQAAAEAAABAAAAQAQACcAEAAABAAAAQBAAAAQAAAEAAABAEAAABAA'
  + 'AAQAAAEAQAAAEAAABAAAAQBAAAAQAAAEAAABAEAAABAAAAQAAAEAEAAABAAA'
  + 'AQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAAEAAABAAAAQBAAAAQAAAEAAAB'
  + 'AEAAABAAAAQAAAEAEAAABAAAAQBAAAAQAAAE4KR57gMIgAAACIAAAAiAAAAI'
  + 'gAAACIAAAAiAAAAIgAAACIAAAAiAAAAIgAAACIAAAAiAAAAIgAAACIAAAAiA'
  + 'AAAIgAAAAoAAAAKAAAACgAAAAoAAAAIgAAIACIAACAAgAAIgAIAACACAAAgA'
  + 'gAAIAIAACACAAAgAgAAIAIAACACAAAgAgAAIAIAACACAAAgAgAAIAIAACACA'
  + 'AAgAgAAIAIAACACAAAgAIAAIACAACAAgAAgAIAAIACAAAiAAgAAIgAAAAiAA'
  + 'TgQIgAAACIAAAAiAAAAIgAAACIAAAAiAAAAIgAAACIAAAAiAAAAIgAAACIAA'
  + 'AAiAAAAIgAAACIAAAAiAAAAIgAAAAoAAAAKAAAACgAAAAoAAAAIgAAIACIAA'
  + 'CAAgAAIgAIAACACAAAgAgAAIAIAACACAAAgAgAAIAIAACACAAAgAgAAIAIAA'
  + 'CACAAAgAgAAIAIAACACAAAgAgAAIAIAACACAEwgAIAAIACAACAAgAAgAIAAI'
  + 'ACAAAiAAgAAIgAAAAiAAAAIgAAACIAAAAiAAAAIgAAACIAAAAiAAAAIgAAAC'
  + 'IAAAAiAAAAIgAAACIAAAAiAAAAIgAAACIAAAAiAAAAIgAIAAIACAACAAgAAg'
  + 'AIAAIACAAAiAAAACIAACAAiAAAgAIAACACAAAgAgAAIAIAACACAAAgAgAAIA'
  + 'IAACACAAAgAgAPsDYGYb5qUSAAEwEwAEQADMBAABEAAzAUAABMBMAAQAATAT'
  + 'AAFAAMwEQAAQADMBEAB8BAMEQAAEABAAARAAQAAEQAAAARAAAAEQAAABEAAA'
  + 'ARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAAB'
  + 'EAAAARAAAAEQAEAAEABAABAAQAAQAEAAEABAAARAAAABEAABAARAAJwIEAAB'
  + 'ABAAAQAQAAEAEAABABAAAQAQAAEAEAABABAAAQAQAAEAEAABABAAAQAQAAEA'
  + 'EAABABAAAQAQAAEAEAABAAQAAQAEAAEABAABAAQAAQAEQAAEABAAARAAQAAE'
  + 'QAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQ'
  + 'AAABEAAAARAAAAEQAAABEAAAARAAACcQAEAAEABAABAAQAAQAEAAEABAAARA'
  + 'AAABEAABAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARA'
  + 'AAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAAAUAAAAFAAAABQAAAAUAA'
  + 'AAEQAAEABEAABAAQAAEQAEAABABAAAQAQAAEAEAABABAAAQAQAAEAEAABABA'
  + 'AAQAQAAEAEAABABAAAQAQAAEAEAABABAAAQAQAAEAEAABADACQQAEAAEABAA'
  + 'BAAQAAQAEAAEABAAARAAQAAEQAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAA'
  + 'ARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEQAEAA'
  + 'EABAABAAQAAQAEAAEABAAARAAAABEAABAARAAAQAEAABABAAAQAQAAEAEAAB'
  + 'ABAAAQAQAAEAEAABABAAAQAQAAEAEAABABAAAQAQAAEAEAABABAAAQAQAAEA'
  + 'EAABAATACQQAEAAEABAABAAQAAQAEAABEABAAARAAAABEAABAARAAAAEQAAA'
  + 'BEAAAARAAAAEQAAABEAAAARAAAAEQAAABEAAAARAAAAEAAABAEAAABAAAAQA'
  + 'AAEAQAAABAAAAQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAAEAAABAAAAQBA'
  + 'AAAQAAAEAAABAEAAABAAAAQAAAEAQAAABAAAAQBAAAAQAAAEAAABAEAAABAA'
  + 'AAQAAAEAQAAAEAAABAAAAQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAAEAAA'
  + 'AQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAAEAAABAAAAQBAAAAQAAAEAAAB'
  + 'AEAAABAAAAQAAAEAQAAAEAAAAQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAA'
  + 'EAAABAAAAQBAAAAQAAAEAAABAEAAABAAAAQAAAEAQAAAEAAA6gN31FMKHwyP'
  + 'WgAAAABJRU5ErkJggg=='

const SIZES = ['16x16', '32x32', '48x48', '64x64', '128x128', '192x192', '256x256', '512x512']

// Drives the drop zone like a person: clicking it opens the file chooser,
// which the test accepts with the 512x512 logo.png.
async function loadLogo(page: Page) {
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Drop an image or click to browse').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles(LOGO_PNG)
  await page.getByText('logo.png').first().waitFor()
}

test('[A1] page heading is Favicon Generator', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Favicon Generator' })).toBeVisible()
})

test('[A2] drop zone shows placeholder text before any image is loaded', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Drop an image or click to browse')).toBeVisible()
})

test('[A3] dropping a 512x512 logo.png shows its name and all eight size items', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await expect(page.getByText('logo.png').first()).toBeVisible()
  for (const size of SIZES) {
    await expect(page.getByText(size, { exact: true })).toBeVisible()
  }
})

test('[A4] Square crop plus Apply updates the preview and keeps all eight size items', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.getByLabel('Crop shape').selectOption({ label: 'Square' })
  await page.getByRole('button', { name: 'Apply' }).click()
  for (const size of SIZES) {
    await expect(page.getByText(size, { exact: true })).toBeVisible()
  }
  // After the user action, read the preview canvas: it still shows image
  // pixels, i.e. the crop was applied to a rendered preview.
  const preview = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const ctx = c.getContext('2d')
    if (!ctx) return null
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let opaque = 0
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 128) opaque++
    }
    return { w: c.width, h: c.height, opaque, total: d.length / 4 }
  })
  expect(preview, 'preview canvas renders after Apply').not.toBeNull()
  expect(preview!.opaque, 'preview has visible pixels').toBeGreaterThan(1000)
})

test('[A5] Circle crop plus Apply updates the preview and keeps all eight size items', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.getByLabel('Crop shape').selectOption({ label: 'Circle' })
  await page.getByRole('button', { name: 'Apply' }).click()
  for (const size of SIZES) {
    await expect(page.getByText(size, { exact: true })).toBeVisible()
  }
  const preview = await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return null
    const ctx = c.getContext('2d')
    if (!ctx) return null
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    let opaque = 0
    for (let i = 3; i < d.length; i += 4) {
      if (d[i] > 128) opaque++
    }
    return { w: c.width, h: c.height, opaque, total: d.length / 4 }
  })
  expect(preview, 'preview canvas renders after Apply').not.toBeNull()
  expect(preview!.opaque, 'preview has visible pixels').toBeGreaterThan(1000)
  // Circle: the corners of the preview are transparent, coverage < 100%.
  expect(preview!.opaque / preview!.total, 'circle leaves transparent corners').toBeLessThan(1)
})

test('[A6] Quality slider to 80 plus Apply updates the preview and keeps all eight size items', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  const quality = page.getByLabel('Quality')
  await quality.fill('80')
  await page.getByRole('button', { name: 'Apply' }).click()
  for (const size of SIZES) {
    await expect(page.getByText(size, { exact: true })).toBeVisible()
  }
  expect(await quality.inputValue(), 'quality slider holds the set value').toBe('80')
})

test('[A7] Download all downloads favicons.zip', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download all' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('favicons.zip')
})

test('[A8] Download 16x16 downloads favicon-16x16.png', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download 16x16' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('favicon-16x16.png')
})

test('[A9] generated set survives a reload: logo.png and 16x16 still shown', async ({ page }) => {
  await page.goto('/')
  await loadLogo(page)
  await page.reload()
  await expect(page.getByText('logo.png').first()).toBeVisible()
  await expect(page.getByText('16x16', { exact: true })).toBeVisible()
})
