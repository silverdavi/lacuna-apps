import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4223
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

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('crash', () => console.log('[CRASH]'))
page.on('close', () => console.log('[CLOSE]'))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(400)
await page.getByRole('tab', { name: 'Players' }).click({ timeout: 5000 })
await page.waitForTimeout(300)
await page.getByLabel('Player name').fill('Alice', { timeout: 3000 })
await page.waitForTimeout(300)

// Inspect the button's React props and parent structure
const info = await page.evaluate(() => {
  const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Add player')
  if (!btn) return 'no button'
  // Find React fiber
  const key = Object.keys(btn).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactFiber$'))
  const propsKey = Object.keys(btn).find(k => k.startsWith('__reactProps$'))
  const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber$'))
  const props = propsKey ? { ...btn[propsKey] } : null
  // clean functions to source
  if (props && props.onClick) {
    props.onClickSrc = props.onClick.toString().slice(0, 500)
    delete props.onClick
  }
  const parentTag = btn.parentElement?.tagName
  const grandparentTag = btn.parentElement?.parentElement?.tagName
  return { props, parentTag, grandparentTag, outerHTML: btn.outerHTML.slice(0, 300) }
})
console.log('BUTTON INFO:', JSON.stringify(info, null, 2))

// Now: does clicking crash? Test by clicking the button via mouse
const box = await page.getByRole('button', { name: 'Add player' }).boundingBox()
console.log('box:', JSON.stringify(box))
try {
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  console.log('CLICK OK, alive:', !page.isClosed())
} catch (e) {
  console.log('CLICK FAILED:', String(e).slice(0, 100), 'alive:', !page.isClosed())
}

await browser.close().catch(() => {})
server.close()
process.exit(0)
