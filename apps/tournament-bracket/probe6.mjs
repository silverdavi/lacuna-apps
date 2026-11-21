import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4207
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

const browser = await chromium.launch({ headless: true, args: ['--headless=new', '--disable-gpu', '--disable-features=VizDisplayCompositor'] })
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
page.on('crash', () => console.log('[CRASH]'))
page.on('close', () => console.log('[CLOSE]'))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)))

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(300)

// Test 1: click the Players tab
console.log('--- Test 1: click Players tab ---')
try {
  await page.getByRole('tab', { name: 'Players' }).click({ timeout: 3000 })
  console.log('Players tab click: OK')
} catch (e) { console.log('Players tab click: FAILED', String(e).slice(0, 150)) }
if (page.isClosed()) { console.log('PAGE CLOSED after tab click'); await browser.close().catch(()=>{}); process.exit(0) }

// Test 2: type in the input
console.log('--- Test 2: fill input ---')
try {
  await page.getByLabel('Player name').fill('Bob', { timeout: 3000 })
  console.log('fill: OK, value =', await page.locator('input').first().inputValue())
} catch (e) { console.log('fill: FAILED', String(e).slice(0, 150)) }
if (page.isClosed()) { console.log('PAGE CLOSED after fill'); await browser.close().catch(()=>{}); process.exit(0) }

// Test 3: click Add player
console.log('--- Test 3: click Add player ---')
try {
  await page.getByRole('button', { name: 'Add player' }).click({ timeout: 3000 })
  console.log('Add player click: OK')
} catch (e) { console.log('Add player click: FAILED', String(e).slice(0, 150)) }
if (!page.isClosed()) {
  await page.waitForTimeout(300)
  console.log('rows:', await page.locator('.lc-table tbody tr').count())
}

await browser.close().catch(() => {})
server.close()
process.exit(0)
