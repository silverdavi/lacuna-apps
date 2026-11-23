import { expect, test } from '@playwright/test'

test('probe: decisive scenarios', async ({ page }) => {
  await page.setContent(`
    <style>
      .hidden-time { display: none; }
    </style>
    <div id="root">
      <h2>Monday</h2>
      <!-- K1: button immediate text is "Math", time in a display:none child -->
      <button class="ct-block k1">Math<span class="hidden-time"> 09:00–10:00</span></button>
      <!-- K2: span immediate "Math", sibling time display:none, both inside button -->
      <button class="ct-block k2"><span class="n">Math</span><span class="hidden-time"> 09:00–10:00</span></button>
      <!-- K3: name span "Math", time in sibling normal -->
      <button class="ct-block k3"><span class="n">Math</span><span class="t"> 09:00–10:00</span></button>
    </div>
  `)
  const root = page.locator('#root')
  for (const id of ['k1','k2','k3']) {
    const m = root.locator('.'+id).getByText('Math', { exact: true })
    const cnt = await m.count()
    let extra = ''
    if (cnt > 0) {
      const el = m.first()
      const info = await el.evaluate((n: HTMLElement) => ({ tag: n.tagName, textContent: n.textContent, innerText: n.innerText }))
      extra = ' ' + JSON.stringify(info)
      let contain = 'FAIL'
      try { await el.toHaveText(/09:00/, { timeout: 500 }); } catch { }
      try {
        // the actual assertion style:
        await root.locator('.'+id).getByText('Math', { exact: true }).first().toContainText('09:00', { timeout: 500 })
        contain = 'PASS'
      } catch { contain = 'FAIL' }
      extra += ` containText=${contain}`
    }
    console.log(`[${id}] exact count=${cnt}${extra}`)
  }
})
