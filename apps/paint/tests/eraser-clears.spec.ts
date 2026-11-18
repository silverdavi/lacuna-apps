import { expect, test } from '@playwright/test'

function opaqueCount(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let n = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++
    return n
  })
}

async function drawLine(page: import('@playwright/test').Page, y: number) {
  const canvas = page.locator('canvas')
  const box = (await canvas.boundingBox())!
  await canvas.dispatchEvent('pointerdown', { pointerId: 1, clientX: box.x + 40, clientY: y })
  await canvas.dispatchEvent('pointermove', { pointerId: 1, clientX: box.x + 200, clientY: y })
  await canvas.dispatchEvent('pointerup', { pointerId: 1 })
}

test('the eraser tool clears pixels it passes over', async ({ page }) => {
  await page.goto('/')

  // Draw a line with the brush.
  await drawLine(page, 150)
  const afterBrush = await opaqueCount(page)
  expect(afterBrush).toBeGreaterThan(0)

  // Switch to the eraser and stroke over the same area.
  await page.getByRole('button', { name: 'Eraser' }).click()
  const eraserPressed = await page.getByRole('button', { name: 'Eraser' }).getAttribute('aria-pressed')
  expect(eraserPressed).toBe('true')

  await drawLine(page, 150)
  const afterErase = await opaqueCount(page)
  expect(afterErase).toBeLessThan(afterBrush)
})
