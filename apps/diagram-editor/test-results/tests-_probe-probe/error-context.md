# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/_probe.spec.ts >> probe
- Location: tests/_probe.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | test('probe', async ({ page }) => {
  4  |   page.on('console', (m) => console.log('CONSOLE', m.type(), m.text()))
  5  |   page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
> 6  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  7  |   await page.getByRole('button', { name: 'Rectangle' }).click()
  8  |   const box = await page.locator('canvas').first().boundingBox()
  9  |   console.log('BOX', JSON.stringify(box))
  10 |   if (box) {
  11 |     await page.mouse.move(box.x + 100, box.y + 100)
  12 |     await page.mouse.down()
  13 |     await page.mouse.move(box.x + 200, box.y + 150, { steps: 8 })
  14 |     await page.mouse.up()
  15 |   }
  16 |   await new Promise((r) => setTimeout(r, 500))
  17 |   const rect = await page.getByText('Rectangle 1').count()
  18 |   console.log('RECT1', rect)
  19 |   const txt = await page.locator('#root').evaluate((el) => (el.textContent || '').slice(0, 600))
  20 |   console.log('TEXT', txt.replace(/\s+/g, ' '))
  21 |   expect(box).toBeTruthy()
  22 | })
  23 | 
```