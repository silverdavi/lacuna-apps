# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/dbg.spec.ts >> debug keydown
- Location: tests/dbg.spec.ts:2:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test } from '@playwright/test'
  2  | test('debug keydown', async ({ page }) => {
> 3  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  4  |   await page.waitForTimeout(400)
  5  |   await page.keyboard.press('ArrowUp')
  6  |   await page.waitForTimeout(400)
  7  |   const body = await page.textContent('body')
  8  |   const m1 = body?.includes('Moves: 1')
  9  |   const m0 = body?.includes('Moves: 0')
  10 |   console.log('HAS_M1=' + m1, 'HAS_M0=' + m0)
  11 | })
  12 | 
```