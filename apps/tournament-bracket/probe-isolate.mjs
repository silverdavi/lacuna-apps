import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4221
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
page.on('console', (m) => { if (m.type() === 'error') console.log('[console-err]', m.text().slice(0, 300)) })

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(400)

// Click Players tab
console.log('--- click Players tab ---')
await page.getByRole('tab', { name: 'Players' }).click({ timeout: 5000 })
await page.waitForTimeout(500)
console.log('after Players tab, alive:', !page.isClosed())

// Now click Add player (the real test)
console.log('--- click Add player ---')
await page.getByLabel('Player name').fill('Alice', { timeout: 3000 })
await page.waitForTimeout(300)
try {
  await page.getByRole('button', { name: 'Add player' }).click({ timeout: 3000 })
  console.log('Add player: OK')
} catch (e) {
  console.log('Add player FAILED:', String(e).slice(0, 150))
}
await page.waitForTimeout(500)
console.log('final alive:', !page.isClosed())

await browser.close().catch(() => {})
server.close()
process.exit(0)
