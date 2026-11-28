import { expect, test } from '@playwright/test'

// A tiny PNG made in the page, so no fixture files are needed.
async function png(page: import('@playwright/test').Page, w: number, h: number, paint: string) {
  const b64 = await page.evaluate(
    ([w, h, paint]) => {
      const c = document.createElement('canvas')
      c.width = w as number
      c.height = h as number
      const x = c.getContext('2d')!
      x.fillStyle = 'rgb(40 80 120)'
      x.fillRect(0, 0, c.width, c.height)
      if (paint === 'square') {
        x.fillStyle = 'rgb(240 200 40)'
        x.fillRect(4, 4, 8, 8)
      }
      return c.toDataURL('image/png').split(',')[1]
    },
    [w, h, paint],
  )
  return Buffer.from(b64, 'base64')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] empty state shows two drop zones and a sample button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Image Diff' })).toBeVisible()
  await expect(page.getByRole('button', { name: /A · Before/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /B · After/ })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Try a sample' }).first()).toBeVisible()
})

test('[A2] the sample shows statistics and a bounding box', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a sample' }).first().click()
  await expect(page.getByText('Changed pixels', { exact: true })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Difference heatmap' })).toBeVisible()
  await page.getByRole('button', { name: 'Overlay', exact: true }).click()
  await expect(page.getByRole('img', { name: /changed pixels and bounding box/ })).toBeVisible()
})

test('[A3] identical images report no differing pixels and 0.00%', async ({ page }) => {
  const a = await png(page, 16, 16, 'none')
  await page.getByTestId('file-A').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: a })
  await page.getByTestId('file-B').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: a })
  await expect(page.getByText('No pixels differ above the threshold')).toBeVisible()
  await expect(page.getByText('0.00%').first()).toBeVisible()
})

test('[A4] a different size is resized with a notice, and a moved square is counted', async ({ page }) => {
  const a = await png(page, 16, 16, 'none')
  const b = await png(page, 32, 32, 'square')
  await page.getByTestId('file-A').setInputFiles({ name: 'a.png', mimeType: 'image/png', buffer: a })
  await page.getByTestId('file-B').setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: b })
  await expect(page.getByText('B was resized from 32x32 to 16x16 to compare')).toBeVisible()
  await expect(page.getByText('No pixels differ')).toHaveCount(0)
})

test('[A5] an unsupported file type shows a reason', async ({ page }) => {
  await page.getByTestId('file-A').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hi') })
  await expect(page.getByRole('alert')).toContainText('notes.txt is text/plain, not a supported image')
})

test('[A6] swap, clear and the persisted tab', async ({ page }) => {
  await page.getByRole('button', { name: 'Try a sample' }).first().click()
  await page.getByRole('button', { name: 'Blink', exact: true }).click()
  await expect(page.getByText(/Showing (A|B)/)).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Try a sample' }).first().click()
  await expect(page.getByRole('button', { name: 'Hold to show B' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(page.getByText('Add an image to each box')).toBeVisible()
})
