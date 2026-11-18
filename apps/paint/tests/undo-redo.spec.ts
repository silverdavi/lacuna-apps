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

async function drawLine(page: import('@playwright/test').Page, relY: number) {
  const canvas = page.locator('canvas')
  const box = (await canvas.boundingBox())!
  await canvas.dispatchEvent('pointerdown', { pointerId: 1, clientX: box.x + 40, clientY: box.y + relY })
  await canvas.dispatchEvent('pointermove', { pointerId: 1, clientX: box.x + 200, clientY: box.y + relY })
  await canvas.dispatchEvent('pointerup', { pointerId: 1 })
}

function expectOpaque(page: import('@playwright/test').Page, expected: number) {
  return expect
    .poll(() => opaqueCount(page), { timeout: 2000 })
    .toBe(expected)
}

test('undo removes the last stroke; redo restores it', async ({ page }) => {
  await page.goto('/')

  const baseline = await opaqueCount(page)
  await drawLine(page, 100)
  const withStroke = await opaqueCount(page)
  expect(withStroke).toBeGreaterThan(baseline)

  // Undo by button (restore is async, so poll).
  await page.getByRole('button', { name: 'Undo' }).click()
  await expectOpaque(page, baseline)

  // Redo by button.
  await page.getByRole('button', { name: 'Redo' }).click()
  await expectOpaque(page, withStroke)

  // Undo by keyboard (Ctrl/Cmd+Z) and redo by Shift+Ctrl/Cmd+Z.
  await page.keyboard.press('Control+z')
  await expectOpaque(page, baseline)

  await page.keyboard.press('Shift+Control+z')
  await expectOpaque(page, withStroke)
})
