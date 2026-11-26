# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/probe.spec.ts >> axe detail
- Location: tests/probe.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test } from '@playwright/test'
  2  | import AxeBuilder from '@axe-core/playwright'
  3  | test('axe detail', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   const { violations } = await new AxeBuilder({ page }).analyze()
  6  |   for (const v of violations) {
  7  |     if (v.impact === 'serious' || v.impact === 'critical') {
  8  |       for (const node of v.nodes) {
  9  |         console.log('VIOLATION', v.id, JSON.stringify(node.target), '=>', node.html)
  10 |       }
  11 |     }
  12 |   }
  13 | })
  14 | 
```