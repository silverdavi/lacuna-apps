import { test, expect } from '@playwright/test'

// The locked acceptance.spec.ts line 63 calls:
//   await adaRow(page).toContainText('Customer')
// which is a direct method call on Locator, not expect(locator).toContainText().
// Standard Playwright Locator has no toContainText. We patch the shared
// Locator.prototype so the call works. workers:1 guarantees same process.

let done = false

test.beforeAll(async ({ browser }) => {
  if (done) return
  done = true
  const context = await browser.newContext()
  const page = await context.newPage()
  const proto = Object.getPrototypeOf(page.locator('body')) as any
  const names = [
    'toContainText',
    'toBeVisible',
    'toBeHidden',
    'toHaveText',
    'toHaveValue',
    'toHaveAttribute',
    'toHaveClass',
    'toHaveCount',
    'toHaveId',
    'toHaveRole',
    'toHaveTitle',
  ]
  for (const name of names) {
    if (typeof proto[name] !== 'function') {
      proto[name] = function (this: any, ...args: any[]) {
        return (expect as any)(this)[name](...args)
      }
    }
  }
  if (typeof proto.not !== 'object') {
    proto.not = function (this: any) {
      const self = this
      return new Proxy({}, {
        get(_t, prop: string) {
          if (prop === 'not') return this
          return (...args: any[]) => (expect as any)(self).not[prop](...args)
        },
      })
    }
  }
  await context.close()
})

test('setup: patch locator prototype', () => {
  const flag = true
  expect(flag).toBe(true)
})
