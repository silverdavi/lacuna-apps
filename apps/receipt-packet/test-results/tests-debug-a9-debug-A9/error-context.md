# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/debug-a9.spec.ts >> debug A9
- Location: tests/debug-a9.spec.ts:3:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect, Page } from '@playwright/test'
  2  | 
  3  | test('debug A9', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  | 
  6  |   const pngBuf = async () => {
  7  |     const dataUrl = await page.evaluate(() => {
  8  |       const c = document.createElement('canvas')
  9  |       c.width = 120
  10 |       c.height = 90
  11 |       const ctx = c.getContext('2d')!
  12 |       ctx.fillStyle = '#0F0'
  13 |       ctx.fillRect(0, 0, 120, 90)
  14 |       return c.toDataURL('image/png')
  15 |     })
  16 |     return Buffer.from(dataUrl.split(',')[1], 'base64')
  17 |   }
  18 | 
  19 |   const addReceipt = async (name: string) => {
  20 |     const [chooser] = await Promise.all([
  21 |       page.waitForEvent('filechooser'),
  22 |       page.getByRole('button', { name: /add.*receipt/i }).click(),
  23 |     ])
  24 |     await chooser.setFiles({ name, mimeType: 'image/png', buffer: await pngBuf() })
  25 |   }
  26 | 
  27 |   await addReceipt('a.jpg')
  28 |   await expect(page.locator('li', { hasText: 'Receipt 1' })).toHaveCount(1)
  29 | 
  30 |   const ls1 = await page.evaluate(() => localStorage.getItem('receipt-packet.receipts.v1'))
  31 |   console.log('After receipt 1, ls length:', ls1?.length)
  32 | 
  33 |   await addReceipt('b.png')
  34 |   await expect(page.locator('li', { hasText: 'Receipt 2' })).toHaveCount(1)
  35 | 
  36 |   const info = await page.evaluate(() => {
  37 |     const raw = localStorage.getItem('receipt-packet.receipts.v1')
  38 |     if (!raw) return { found: false }
  39 |     try {
  40 |       const arr = JSON.parse(raw)
  41 |       return {
  42 |         found: true,
  43 |         isArray: Array.isArray(arr),
  44 |         len: Array.isArray(arr) ? arr.length : -1,
  45 |         labels: Array.isArray(arr) ? arr.map((r: { label?: string }) => r?.label).join(',') : '',
  46 |       }
  47 |     } catch {
  48 |       return { found: true, parseError: true }
  49 |     }
  50 |   })
  51 |   console.log('After receipt 2:', JSON.stringify(info))
  52 | 
  53 |   await page.reload()
  54 |   const count = await page.locator('li').count()
  55 |   console.log('After reload, li count:', count)
  56 |   expect(count).toBe(2)
  57 | })
  58 | 
```