import { expect, test, type Locator } from '@playwright/test'

// Register the toHaveFocus matcher before any acceptance test runs.
// This file sorts before acceptance.spec.ts alphabetically, so its
// top-level code executes first in the same worker process.
expect.extend({
  async toHaveFocus(_received: Locator) {
    const pass = await _received.evaluate((el) => el === document.activeElement)
    return {
      pass,
      message: () => `expected element to have focus`,
    }
  },
})

test('aa-focus-matcher registered', () => {
  expect(typeof (expect({} as Locator) as Record<string, unknown>).toHaveFocus).toBe('function')
})
