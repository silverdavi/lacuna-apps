# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/debug-drag.spec.ts >> debug: check element at drag target
- Location: tests/debug-drag.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('debug: check element at drag target', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   
  6  |   // Add a task
  7  |   await page.getByRole('button', { name: 'Add task' }).click()
  8  |   const nameInput = page.locator('input').first()
  9  |   await nameInput.fill('Design')
  10 |   await page.locator('input[type="date"]').nth(0).fill('2024-01-15')
  11 |   await page.locator('input[type="number"]').first().fill('5')
  12 |   await page.getByRole('button', { name: 'Add' }).click()
  13 |   
  14 |   // Get the span bounding box
  15 |   const span = page.getByText('Design')
  16 |   const box = await span.boundingBox()
  17 |   console.log('Span bounding box:', JSON.stringify(box))
  18 |   
  19 |   // Target position: 5px left of span top-left
  20 |   const targetX = box!.x - 5
  21 |   const targetY = box!.y + box!.height / 2
  22 |   
  23 |   console.log('Target position:', { x: targetX, y: targetY })
  24 |   
  25 |   // Check what element is at that position
  26 |   const elementAtPoint = await page.evaluate(([x, y]) => {
  27 |     const el = document.elementFromPoint(x, y)
  28 |     if (!el) return null
  29 |     return {
  30 |       tag: el.tagName,
  31 |       className: el.className,
  32 |       text: el.textContent?.slice(0, 50),
  33 |       rect: el.getBoundingClientRect(),
  34 |       parent: el.parentElement?.tagName,
  35 |       grandparent: el.parentElement?.parentElement?.tagName,
  36 |     }
  37 |   }, [targetX, targetY])
  38 |   
  39 |   console.log('Element at target point:', JSON.stringify(elementAtPoint, null, 2))
  40 |   
  41 |   // Also check the bar div
  42 |   const barDiv = page.locator('[data-gantt-bar]')
  43 |   const barBox = await barDiv.boundingBox()
  44 |   console.log('Bar div bounding box:', JSON.stringify(barBox))
  45 |   
  46 |   // Check the container
  47 |   const container = page.locator('[role="application"]')
  48 |   const contBox = await container.boundingBox()
  49 |   console.log('Container bounding box:', JSON.stringify(contBox))
  50 | })
  51 | 
```