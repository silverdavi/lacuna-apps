import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4203
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

const browser = await chromium.launch({
  args: ['--enable-logging=stderr', '--v=1', '--crash-dumps-dir=/home/agent/worktrees/lacuna-apps/tournament-bracket/apps/tournament-bracket/.crashdumps']
})
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[console]', m.type(), m.text().slice(0, 400)) })
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 400)))
page.on('crash', () => console.log('[CRASH]'))
page.on('close', () => console.log('[CLOSE]'))

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(300)
await page.getByRole('tab', { name: 'Players' }).click({ timeout: 5000 })
await page.waitForTimeout(200)
await page.getByLabel('Player name').fill('Alice', { timeout: 5000 })
await page.waitForTimeout(200)

const box = await page.getByRole('button', { name: 'Add player' }).boundingBox()
const cx = box.x + box.width / 2, cy = box.y + box.height / 2
console.log('CENTER', cx, cy)

// Capture what the button's React handler does by adding a wrapper
const handlerInfo = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y)
  const key = Object.keys(el).find(k => k.startsWith('__reactProps$'))
  if (!key) return { hasReactProps: false }
  const props = el[key]
  const fnStr = props.onClick ? props.onClick.toString().slice(0, 500) : 'no onClick'
  return { hasReactProps: true, onClick: fnStr, keys: Object.keys(props) }
}, [cx, cy])
console.log('HANDLER INFO', JSON.stringify(handlerInfo, null, 2))

// Now click via CDP
console.log('--- clicking ---')
const cdp = await ctx.newCDPSession(page)
try {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy })
  await new Promise(r => setTimeout(r, 150))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 })
  await new Promise(r => setTimeout(r, 150))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 })
  console.log('CDP click done')
  await new Promise(r => setTimeout(r, 500))
  console.log('rows:', await page.locator('.lc-table tbody tr').count())
} catch (e) {
  console.log('CLICK THREW:', String(e).slice(0, 300))
}

// Check for crash dump
await new Promise(r => setTimeout(r, 2000))
const dumps = fs.readdirSync('/home/agent/worktrees/lacuna-apps/tournament-bracket/apps/tournament-bracket/.crashdumps').catch(() => [])
console.log('CRASH DUMPS', dumps)
await browser.close().catch(() => {})
server.close()
process.exit(0)
