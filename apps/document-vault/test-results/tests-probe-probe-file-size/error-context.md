# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/probe.spec.ts >> probe file size
- Location: tests/probe.spec.ts:3:1

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
  3  | test('probe file size', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   await page.setContent(`
  6  |     <div id="out"></div>
  7  |     <button id="add">Add document</button>
  8  |     <script>
  9  |       document.getElementById('add').addEventListener('click', () => {
  10 |         const input = document.createElement('input')
  11 |         input.type = 'file'
  12 |         input.addEventListener('change', async () => {
  13 |           const f = input.files?.[0]
  14 |           const text = await f.text()
  15 |           document.getElementById('out').textContent = JSON.stringify({ size: f.size, name: f.name, len: text.length, text })
  16 |         })
  17 |         input.click()
  18 |       })
  19 |     </script>
  20 |   `)
  21 |   const [chooser] = await Promise.all([
  22 |     page.waitForEvent('filechooser'),
  23 |     page.getByRole('button', { name: 'Add document' }).click(),
  24 |   ])
  25 |   await chooser.setFiles({ name: 'invoice.pdf', mimeType: 'application/pdf', buffer: Buffer.from('PDFDATA') })
  26 |   await page.waitForTimeout(500)
  27 |   console.log('PROBE:', (await page.locator('#out').textContent()) ?? '')
  28 | })
  29 | 
```