import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4201
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
page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 500)))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 500)))
page.on('crash', () => console.log('[CRASH]'))
page.on('close', () => console.log('[CLOSE]'))
// capture console messages via CDP for crash-time logs
const cdp = await ctx.newCDPSession(page)
cdp.on('Runtime.consoleAPICalled', (msg) => {
  if (msg.type === 'error') console.log('[CDP console-err]', JSON.stringify(msg.args?.map(a => a.value ?? a.description ?? a.type)?.slice(0, 3)).slice(0, 400))
})
cdp.on('Runtime.exceptionThrown', (msg) => {
  console.log('[CDP exception]', JSON.stringify(msg.exceptionDetails?.text)?.slice(0, 300), JSON.stringify(msg.exceptionDetails?.exception?.description)?.slice(0, 400))
})

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(300)
await page.getByRole('tab', { name: 'Players' }).click({ timeout: 5000 })
await page.waitForTimeout(200)
await page.getByLabel('Player name').fill('Alice', { timeout: 5000 })
await page.waitForTimeout(200)

const box = await page.getByRole('button', { name: 'Add player' }).boundingBox()
const cx = box.x + box.width / 2, cy = box.y + box.height / 2
console.log('CENTER', cx, cy)

// What is the click handler? Check listeners
const listenerInfo = await page.evaluate(([x, y]) => {
  const el = document.elementFromPoint(x, y)
  return {
    tag: el?.tagName,
    className: el?.className,
    text: el?.textContent,
    hasOnClick: el?.getAttribute('onclick'),
    outer: el?.outerHTML?.slice(0, 200),
  }
}, [cx, cy])
console.log('LISTENER INFO', JSON.stringify(listenerInfo))

console.log('--- clicking via mouse (CDP) ---')
try {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cx, y: cy })
  await new Promise(r => setTimeout(r, 100))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, button: 'left', clickCount: 1 })
  await new Promise(r => setTimeout(r, 100))
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, button: 'left', clickCount: 1 })
  console.log('CDP click dispatched OK')
  await new Promise(r => setTimeout(r, 500))
  console.log('rows after:', await page.locator('.lc-table tbody tr').count())
} catch (e) {
  console.log('CDP CLICK FAILED:', String(e).slice(0, 300))
}

await browser.close().catch(() => {})
server.close()
process.exit(0)
