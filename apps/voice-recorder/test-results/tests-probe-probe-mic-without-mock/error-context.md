# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/probe.spec.ts >> probe: mic without mock
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
  3  | test('probe: mic without mock', async ({ page }) => {
> 4  |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  5  |   const result = await page.evaluate(async () => {
  6  |     try {
  7  |       const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  8  |       const tracks = stream.getTracks()
  9  |       const info: string[] = []
  10 |       for (const t of tracks) {
  11 |         info.push(`${t.kind}:${t.readyState}:${t.label}`)
  12 |       }
  13 |       // record 1.2s
  14 |       const chunks: Blob[] = []
  15 |       const rec = new MediaRecorder(stream, { mimeType: 'audio/webm' })
  16 |       rec.ondataavailable = (e) => { if (e.data) chunks.push(e.data) }
  17 |       let done = Promise.resolve()
  18 |       rec.onstop = () => { done = Promise.resolve() }
  19 |       rec.start()
  20 |       await new Promise((r) => setTimeout(r, 1200))
  21 |       rec.stop()
  22 |       await done
  23 |       stream.getTracks().forEach((t) => t.stop())
  24 |       const blob = new Blob(chunks, { type: 'audio/webm' })
  25 |       return { ok: true, tracks: info, size: blob.size, type: blob.type }
  26 |     } catch (e) {
  27 |       return { ok: false, error: e instanceof Error ? e.message : String(e) }
  28 |     }
  29 |   })
  30 |   console.log('M mic:', JSON.stringify(result))
  31 |   expect(true).toBe(true)
  32 | })
  33 | 
```