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

test('dragging on the canvas changes pixels along the path', async ({ page }) => {
  await page.goto('/')
  const before = await opaqueCount(page)
  expect(before).toBe(0)

  const canvas = page.locator('canvas')
  const box = (await canvas.boundingBox())!
  expect(box).not.toBeNull()

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 1,
    clientX: box!.x + box!.width / 3,
    clientY: box!.y + box!.height / 2,
  })
  await canvas.dispatchEvent('pointermove', {
    pointerId: 1,
    clientX: box!.x + box!.width / 2,
    clientY: box!.y + box!.height / 2,
  })
  await canvas.dispatchEvent('pointerup', { pointerId: 1 })

  const after = await opaqueCount(page)
  expect(after).toBeGreaterThan(before)
})
