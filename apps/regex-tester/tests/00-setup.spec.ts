import { expect, test } from '@playwright/test'

expect.extend({
  async toContainElement(this: any, locator: any, expected: any) {
    const count = await locator.count()
    if (count === 0) {
      return {
        pass: false,
        message: () => 'expected locator to have at least one element, got 0',
      }
    }
    const innerCount = await locator.first().locator(expected).count()
    const pass = innerCount > 0
    return {
      pass,
      message: () =>
        pass
          ? `expected locator not to contain matching element, but found ${innerCount}`
          : 'expected locator to contain a matching element, found none',
    }
  },
})

test('setup: regex tester page loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Regex Tester' })).toBeVisible()
})
