# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/dbg.spec.ts >> dbg long
- Location: tests/dbg.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, type Page } from '@playwright/test'
  2  | const input = (page: Page) => page.getByLabel('Input')
  3  | test('dbg long', async ({ page }) => {
  4  |   const T0 = new Date('2026-01-01T09:00:00')
  5  |   const TS = new Date('2026-01-01T09:01:00')
  6  |   await page.clock.install({ time: T0 })
> 7  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  8  |   await page.clock.pauseAt(TS)
  9  |   await page.getByLabel('Length').selectOption('long')
  10 |   await page.getByRole('button', { name: 'Start Test' }).click()
  11 |   await input(page).fill('The quick brown fox ju')
  12 |   await page.waitForTimeout(300)
  13 |   const t = await page.locator('#root').innerText()
  14 |   console.log('CORRECT-LINE:', t.split('\n').filter((l) => l.startsWith('Correct')).join(' | '))
  15 |   console.log('PASSAGE-LEN:', (await page.getByLabel('Passage').innerText()).length)
  16 | })
  17 | 
```