import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('axe report', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  const { violations } = await new AxeBuilder({ page }).analyze()
  const out = violations.map(v => {
    const lines = [`${v.impact}: ${v.id}: ${v.help}`]
    for (const n of v.nodes.slice(0, 4)) lines.push(`  ${n.html}`)
    return lines.join('\n')
  }).join('\n')
  console.log(out || 'NO VIOLATIONS')
  expect(violations.length).toBe(0)
})
