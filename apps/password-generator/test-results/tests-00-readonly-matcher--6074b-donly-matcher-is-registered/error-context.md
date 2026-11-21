# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/00-readonly-matcher.spec.ts >> [setup] readonly matcher is registered
- Location: tests/00-readonly-matcher.spec.ts:19:1

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
  3  | declare module '@playwright/test' {
  4  |   interface Matchers<R> {
  5  |     toBeReadOnly(): Promise<R>
  6  |   }
  7  | }
  8  | 
  9  | expect.extend({
  10 |   async toBeReadOnly(received: { isEditable: () => Promise<boolean> }) {
  11 |     const editable = await received.isEditable()
  12 |     return {
  13 |       pass: editable === false,
  14 |       message: () => `expected field to be read-only, but isEditable() returned ${editable}`,
  15 |     }
  16 |   },
  17 | })
  18 | 
  19 | test('[setup] readonly matcher is registered', async ({ page }) => {
> 20 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  21 |   const field = page.getByLabel('Password')
  22 |   await expect(field).toBeReadOnly()
  23 | })
  24 | 
```