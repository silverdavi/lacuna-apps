import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4195

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
}

const server = http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let file = path.join(dist, url)
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      const asset = path.join(dist, 'assets', path.basename(url))
      file = /\.\w+$/.test(url) && fs.existsSync(asset) ? asset : path.join(dist, 'index.html')
    }
    res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
    fs.createReadStream(file).pipe(res)
  })
  .listen(port, '127.0.0.1')

const timeout = setTimeout(() => {
  console.log('GLOBAL TIMEOUT - forcing exit')
  process.exit(2)
}, 45000)

const browser = await chromium.launch()
const ctx = await browser.newContext()
const page = await ctx.newPage()

page.on('console', (m) => console.log('[console]', m.type(), m.text().slice(0, 300)))
page.on('pageerror', (e) => console.log('[pageerror]', String(e).slice(0, 300)))
page.on('crash', () => console.log('[CRASH] page crashed'))
page.on('close', () => console.log('[CLOSE] page closed'))

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(300)
console.log('initial rows:', await page.locator('.lc-table tbody tr').count())

await page.getByRole('tab', { name: 'Players' }).click({ timeout: 5000 })
await page.waitForTimeout(200)

await page.getByLabel('Player name').fill('Alice', { timeout: 5000 })
console.log('input value after fill:', await page.locator('input').first().inputValue())

try {
  await page.getByRole('button', { name: 'Add player' }).click({ timeout: 8000 })
  console.log('CLICK OK')
} catch (e) {
  console.log('CLICK FAILED:', String(e).slice(0, 150))
}

await page.waitForTimeout(500)
try {
  console.log('rows after click:', await page.locator('.lc-table tbody tr').count())
  console.log('input value now:', await page.locator('input').first().inputValue())
  console.log('ALIVE CHECK OK')
} catch (e) {
  console.log('ALIVE CHECK FAILED:', String(e).slice(0, 150))
}

await browser.close()
server.close()
clearTimeout(timeout)
process.exit(0)
