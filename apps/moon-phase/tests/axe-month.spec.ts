import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const appearance of ['light', 'dark']) {
  for (const width of [1280, 390]) {
    test(`[A8] month view has no serious accessibility issues (${appearance}, ${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      await page.evaluate((a) => document.documentElement.setAttribute('data-appearance', a), appearance)
      await page.getByLabel('Date').fill('2024-04-08')
      await page.getByRole('button', { name: 'Month' }).click()
      await page.waitForTimeout(100)
      const res = await new AxeBuilder({ page }).analyze()
      const bad = res.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.html.slice(0, 120)}`)
      expect(bad).toEqual([])
    })
  }
}
