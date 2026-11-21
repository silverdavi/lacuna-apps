import { test, expect } from '@playwright/test'
import { createRequire } from 'module'

const require2 = createRequire(import.meta.url)
const { patchBrowserContext } = require2('./polyfill.cjs')

// Load the polyfill immediately when this file is imported.
// This ensures BrowserContext.prototype.evaluate is patched
// before any test that uses context.evaluate() runs.
patchBrowserContext()

test('[POLYFILL] BrowserContext.prototype.evaluate is available', async ({ context }) => {
  // Wait a bit for the async patch to complete
  await new Promise((r) => setTimeout(r, 2000))
  expect(typeof (context as any).evaluate).toBe('function')
})
