import { chromium } from '/home/agent/worktrees/lacuna-apps/tournament-bracket/node_modules/.pnpm/playwright-core@1.65.1/node_modules/playwright-core/index.mjs'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const dist = path.resolve('dist')
const port = 4213
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

await page.goto(`http://127.0.0.1:${port}`, { timeout: 15000 })
await page.waitForTimeout(300)

// Test A: click a button that has NO React onClick (e.g., a tab button that's already selected, or add a plain button)
// First, let's add a plain button to the page and click it
await page.evaluate(() => {
  const btn = document.createElement('button')
  btn.textContent = 'Plain button'
  btn.style.position = 'fixed'
  btn.style.top = '10px'
  btn.style.right = '10px'
  btn.style.zIndex = '9999'
  document.body.appendChild(btn)
  window.__plainBtn = btn
})
const pbox = await page.locator('button:text("Plain button")').boundingBox()
console.log('Plain button box:', JSON.stringify(pbox))
console.log('--- Test A: click plain button (no React) ---')
try {
  await page.mouse.click(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2)
  console.log('Plain button click: OK')
} catch (e) {
  console.log('Plain button click: FAILED', String(e).slice(0, 150))
}
console.log('alive after plain click:', !page.isClosed())
if (page.isClosed()) { await browser.close().catch(()=>{}); process.exit(0) }

// Test B: click a React button (tab button) that already exists
console.log('--- Test B: click Bracket tab (React, has onClick) ---')
try {
  await page.getByRole('tab', { name: 'Bracket' }).click({ timeout: 3000 })
  console.log('Bracket tab click: OK')
} catch (e) {
  console.log('Bracket tab click: FAILED', String(e).slice(0, 150))
}
console.log('alive after Bracket tab:', !page.isClosed())
if (page.isClosed()) { await browser.close().catch(()=>{}); process.exit(0) }

// Test C: click Players tab then Add player
console.log('--- Test C: Players tab + Add player ---')
await page.getByRole('tab', { name: 'Players' }).click({ timeout: 3000 })
await page.waitForTimeout(200)
await page.getByLabel('Player name').fill('Alice', { timeout: 3000 })
await page.waitForTimeout(200)
try {
  await page.getByRole('button', { name: 'Add player' }).click({ timeout: 3000 })
  console.log('Add player: OK')
} catch (e) {
  console.log('Add player: FAILED', String(e).slice(0, 150))
}
console.log('alive after Add player:', !page.isClosed())

await browser.close().catch(() => {})
server.close()
process.exit(0)
