import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

test('circle crop leaves transparent corners on the preview', async ({ page }) => {
  await page.goto('/')

  // Load the logo through the file chooser the drop zone opens.
  const fileChooserPromise = page.waitForEvent('filechooser')
  await page.getByText('Drop an image or click to browse').click()
  const fileChooser = await fileChooserPromise
  await fileChooser.setFiles({
    name: 'logo.png',
    mimeType: 'image/png',
    buffer: readFileSync(path.join(__dirname, 'fixtures', 'logo.png')),
  })
  await page.getByText('logo.png').first().waitFor()

  // Circle crop, then apply.
  await page.getByLabel('Crop shape').selectOption({ label: 'Circle' })
  await page.getByRole('button', { name: 'Apply' }).click()

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

  expect(preview).not.toBeNull()
  expect(preview!.opaque).toBeGreaterThan(1000)
  // Circle crop: the corners are transparent, so coverage is under 100%.
  expect(preview!.opaque / preview!.total).toBeLessThan(1)
})
