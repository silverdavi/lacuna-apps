import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4219
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
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 200)))
page.on('console', (m) => { if (m.type() === 'error') console.log('[console-err]', m.text().slice(0, 200)) })

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
console.log('loaded, title:', await page.title())

// Just wait and check stability
for (let i = 0; i < 10; i++) {
  await page.waitForTimeout(500)
  console.log(`t=${(i + 1) * 500}ms alive:`, !page.isClosed())
  if (page.isClosed()) break
}

// Try a simple evaluate
if (!page.isClosed()) {
  try {
    const r = await page.evaluate(() => 1 + 1)
    console.log('evaluate 1+1 =', r)
  } catch (e) { console.log('evaluate failed:', String(e).slice(0, 100)) }
}

// Try a simple input fill
if (!page.isClosed()) {
  const input = await page.locator('input').first()
  if (await input.count() > 0) {
    try {
      await input.fill('test')
      console.log('fill: OK, value =', await input.inputValue())
    } catch (e) { console.log('fill failed:', String(e).slice(0, 100)) }
  }
}

// Try clicking a button
if (!page.isClosed()) {
  const btns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()).filter(Boolean))
  console.log('buttons:', JSON.stringify(btns.slice(0, 10)))
  if (btns.length > 0) {
    try {
      await page.getByRole('button', { name: btns[0] }).first().click({ timeout: 3000 })
      console.log(`click "${btns[0]}": OK, alive:`, !page.isClosed())
    } catch (e) {
      console.log(`click "${btns[0]}": ${String(e).slice(0, 100)}, alive:`, !page.isClosed())
    }
  }
}

await browser.close().catch(() => {})
server.close()
process.exit(0)
