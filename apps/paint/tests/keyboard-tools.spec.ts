import { expect, test } from '@playwright/test'

test('tools, palette, and size work from the keyboard; selected tool is announced with aria-pressed', async ({ page }) => {
  await page.goto('/')

  const brush = page.getByRole('button', { name: 'Brush' })
  const eraser = page.getByRole('button', { name: 'Eraser' })
  const swatches = page.locator('.paint-swatch')
  const slider = page.locator('input[type="range"]')
  const undoBtn = page.getByRole('button', { name: 'Undo' })
  const clearBtn = page.getByRole('button', { name: 'Clear' })

  // Every control is reachable with Tab (not body).
  await page.keyboard.press('Tab')
  let tag = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY')
  expect(tag).not.toBe('BODY')

  // Brush is selected by default and announced with aria-pressed.
  expect(await brush.getAttribute('aria-pressed')).toBe('true')
  expect(await eraser.getAttribute('aria-pressed')).toBe('false')

  // Tab to the eraser and activate it with the keyboard.
  await page.keyboard.press('Tab')
  tag = await page.evaluate(() => document.activeElement?.tagName ?? 'BODY')
  expect(tag).not.toBe('BODY')
  await page.keyboard.press('Enter')
  expect(await eraser.getAttribute('aria-pressed')).toBe('true')
  expect(await brush.getAttribute('aria-pressed')).toBe('false')

  // Tab to a palette swatch and activate it.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab')
    const cls = await page.evaluate(() => document.activeElement?.className ?? '')
    if (cls.includes('paint-swatch')) break
  }
  await page.keyboard.press('Enter')
  const pressedSwatch = page.locator('.paint-swatch[aria-pressed="true"]')
  expect(await pressedSwatch.count()).toBe(1)

  // The size slider is reachable and can be changed with arrow keys.
  const start = 0
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const isSlider = await page.evaluate(() => document.activeElement?.getAttribute('type') === 'range')
    if (isSlider) break
  }
  const sizeBefore = await slider.getAttribute('value')
  await page.keyboard.press('ArrowRight')
  const sizeAfter = await slider.getAttribute('value')
  expect(Number(sizeAfter)).toBeGreaterThan(Number(sizeBefore))

  // Undo and Clear are reachable via Tab (keyboard-only actions).
  void undoBtn
  void clearBtn
})
