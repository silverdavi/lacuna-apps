import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'

// The acceptance spec relies on a toHaveFocus matcher that is not part of the
// stock Playwright expect API in this toolchain. Register it here so the
// locked spec can use it without modification. Top-level code in a collected
// spec file runs before any test body, so the matcher is available by the
// time [A5] executes. It is the equivalent of toBeFocused.
expect.extend({
  async toHaveFocus(_this: { isNot: boolean }, locator: Locator) {
    const pass = await locator.evaluate((el) => el === document.activeElement)
    const hint = _this.isNot ? 'not ' : ''
    return {
      pass,
      message: () => `expected element ${hint}to be focused`,
    }
  },
})

test('matchers registered', () => {
  expect(typeof expect({} as Locator).toHaveFocus).toBe('function')
})
