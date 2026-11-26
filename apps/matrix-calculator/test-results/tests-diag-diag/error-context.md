# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/diag.spec.ts >> diag
- Location: tests/diag.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test } from '@playwright/test'
  2  | 
  3  | test('diag', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await page.waitForTimeout(500)
  6  |   const html = await page.locator('select').first().evaluate((el) => el.outerHTML)
  7  |   console.log('SELECT HTML:', html)
  8  |   const role = await page.getByRole('combobox', { name: 'Operation' }).count()
  9  |   console.log('combobox count:', role)
  10 |   const sel = await page.getByRole('select', { name: 'Operation' }).count()
  11 |   console.log('select count:', sel)
  12 |   const aria = await page.locator('[aria-label="Operation"]').count()
  13 |   console.log('aria-label count:', aria)
  14 | })
  15 | 
```