import { chromium } from '@playwright/test'

const b = await chromium.launch()
const ctx = await b.newContext()
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:4193/')
await page.waitForTimeout(300)
const info = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button.lc-btn.ghost')].find((b) => b.textContent?.includes('Export'))
  if (!btn) return { found: false }
  let el = btn
  const chain = []
  while (el && el !== document.documentElement) {
    const s = getComputedStyle(el)
    chain.push({ tag: el.tagName, cls: el.className?.toString().slice(0, 50), bg: s.backgroundColor, col: s.color })
    el = el.parentElement
  }
  return { found: true, chain }
})
console.log(JSON.stringify(info, null, 2))
await b.close()
