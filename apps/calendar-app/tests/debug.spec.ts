import { test } from '@playwright/test'

test('debug: immediate text check', async ({ page }) => {
  const variants = [
    `<div><span>Team Sync</span>15</div>`,
    `<div>15 Team Sync</div>`,
    `<div>15Team Sync</div>`,
    `<div>Team Sync15</div>`,
    `<div> 15 Team Sync</div>`,
  ]
  for (let i = 0; i < variants.length; i++) {
    await page.setContent(variants[i])
    console.log(`v${i} exact:`, await page.locator('text="15"').count())
    console.log(
      `v${i} filter:`,
      await page.locator('text="15"').filter({ hasText: 'Team Sync' }).count()
    )
  }
})
