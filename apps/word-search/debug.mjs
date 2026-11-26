import { chromium } from '@playwright/test'

async function readGrid(page) {
  const rows = await page.locator('[role="row"]').all()
  const grid = []
  for (const row of rows) {
    const cells = await row.locator('[role="gridcell"]').all()
    // Reproduce EXACTLY: map without await
    grid.push(cells.map((c) => (c.textContent() ?? '').trim().toUpperCase()))
  }
  return grid
}

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('http://127.0.0.1:4183/')
await page.getByLabel('Words').fill('CAT,DOG')
await page.getByRole('button', { name: 'Generate' }).click()
await page.waitForTimeout(500)

try {
  const grid = await readGrid(page)
  console.log('readGrid succeeded, rows:', grid.length)
  console.log('row0:', JSON.stringify(grid[0]))
} catch (e) {
  console.log('readGrid FAILED:', e.message)
}

// Now test with await (proper):
const rows = await page.locator('[role="row"]').all()
const row0cells = await rows[0].locator('[role="gridcell"]').all()
console.log('--- testing each cell with await ---')
for (let i = 0; i < row0cells.length; i++) {
  const c = row0cells[i]
  const t = await c.textContent()
  console.log(`cell ${i}:`, typeof t, JSON.stringify(t))
}
await browser.close()
