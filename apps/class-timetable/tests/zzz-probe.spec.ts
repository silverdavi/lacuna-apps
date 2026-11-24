import { expect, test } from '@playwright/test'

test('probe: various structures for exact match + toContainText', async ({ page }) => {
  const structures = [
    // 0: name + time in same button
    `<div class="col"><h2>Monday</h2><button class="ct-block">Math 09:00–10:00</button></div>`,
    // 1: name in span, time in span, both in button
    `<div class="col"><h2>Monday</h2><button class="ct-block"><span>Math</span><span> 09:00–10:00</span></button></div>`,
    // 2: name as direct text, time in span
    `<div class="col"><h2>Monday</h2><button class="ct-block">Math<span> 09:00–10:00</span></button></div>`,
    // 3: name in span, time as direct text
    `<div class="col"><h2>Monday</h2><button class="ct-block"><span>Math</span> 09:00–10:00</button></div>`,
    // 4: name in strong, time in span
    `<div class="col"><h2>Monday</h2><button class="ct-block"><strong>Math</strong> 09:00–10:00</button></div>`,
  ]

  for (let idx = 0; idx < structures.length; idx++) {
    await page.setContent(structures[idx])
    const scoped = page.locator('h2', { hasText: 'Monday' }).locator('..')
    const m = scoped.getByText('Math', { exact: true })
    const count = await m.count()
    let contain = 'N/A'
    if (count > 0) {
      const tags = await m.evaluateAll((els) => els.map((e) => e.tagName + ':' + JSON.stringify(e.textContent)))
      try { await expect(m).toContainText('09:00–10:00', { timeout: 1000 }); contain = 'PASS'; } catch { contain = 'FAIL'; }
      console.log(`structure ${idx}: count=${count} toContainText=${contain} elements=${JSON.stringify(tags)}`)
    } else {
      console.log(`structure ${idx}: count=0`)
    }
  }
  expect(true).toBe(true)
})
