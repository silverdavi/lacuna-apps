import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4199
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  let file = path.join(dist, url)
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    const asset = path.join(dist, 'assets', path.basename(url))
    file = /\.\w+$/.test(url) && fs.existsSync(asset) ? asset : path.join(dist, 'index.html')
  }
  res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}).listen(port, '127.0.0.1')

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error') console.log('[console-err]', m.text().slice(0, 300)) })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
page.on('crash', () => console.log('[CRASH]'))

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(300)
await page.getByRole('tab', { name: 'Players' }).click({ timeout: 5000 })
await page.waitForTimeout(200)
await page.getByLabel('Player name').fill('Alice', { timeout: 5000 })
await page.waitForTimeout(200)

const box = await page.getByRole('button', { name: 'Add player' }).boundingBox()
console.log('BUTTON BOX', JSON.stringify(box))
const cx = box.x + box.width / 2, cy = box.y + box.height / 2
console.log('CENTER', cx, cy)

// What element is at the center point?
const atPoint = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y)
  const chain = []
  let cur = el
  let depth = 0
  while (cur && depth < 12) {
    const r = cur.getBoundingClientRect()
    const cs = getComputedStyle(cur)
    chain.push(`${cur.tagName.toLowerCase()}.${(cur.className || '').toString().split(' ').slice(0, 3).join('.')} rect=${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)} pos=${cs.position} pe=${cs.pointerEvents} z=${cs.zIndex}`)
    cur = cur.parentElement
    depth++
  }
  return chain
}, [cx, cy])
console.log('ELEMENT AT POINT (center):')
for (const line of atPoint) console.log('  ', line)

// raw mouse click with logging
console.log('--- raw mouse click ---')
try {
  await page.mouse.move(cx, cy)
  await page.waitForTimeout(100)
  await page.mouse.down()
  await page.waitForTimeout(100)
  await page.mouse.up()
  console.log('RAW MOUSE: OK (no throw)')
  await page.waitForTimeout(300)
  console.log('rows after raw mouse:', await page.locator('.lc-table tbody tr').count())
} catch (e) {
  console.log('RAW MOUSE FAILED:', String(e).slice(0, 200))
}

// check for any elements with pointer-events issues or fixed/absolute covering
const covering = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'))
  const out = []
  for (const el of all) {
    const cs = getComputedStyle(el)
    const pos = cs.position
    if ((pos === 'fixed' || pos === 'absolute') && (cs.pointerEvents === 'none' || cs.zIndex !== 'auto')) {
      const r = el.getBoundingClientRect()
      if (r.width > 50 && r.height > 50) {
        out.push(`${el.tagName.toLowerCase()}.${(el.className||'').toString().split(' ').slice(0,3).join('.')} pos=${pos} pe=${cs.pointerEvents} z=${cs.zIndex} rect=${Math.round(r.x)},${Math.round(r.y)},${Math.round(r.width)}x${Math.round(r.height)}`)
      }
    }
  }
  return out
})
console.log('FIXED/ABSOLUTE with pointer-events or z-index:')
for (const line of covering) console.log('  ', line)

await browser.close()
server.close()
process.exit(0)
