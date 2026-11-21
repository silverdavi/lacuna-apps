import { test, expect } from '@playwright/test'

declare module '@playwright/test' {
  interface Matchers<R> {
    toBeReadOnly(): Promise<R>
  }
}

expect.extend({
  async toBeReadOnly(received: { isEditable: () => Promise<boolean> }) {
    const editable = await received.isEditable()
    return {
      pass: editable === false,
      message: () => `expected field to be read-only, but isEditable() returned ${editable}`,
    }
  },
})

test('[setup] readonly matcher is registered', async ({ page }) => {
  await page.goto('/')
  const field = page.getByLabel('Password')
  await expect(field).toBeReadOnly()
})
