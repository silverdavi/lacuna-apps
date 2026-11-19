import { test } from '@playwright/test'

const KEY = 'lacuna.game-2048.game-state.v1'

async function board(page: import('@playwright/test').Page) {
  return page.evaluate((size) => {
    const cells = Array.from(document.querySelectorAll('[data-cell]'))
    const at: (number | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))
    for (const c of cells) {
      const r = Number(c.dataset.row)
      const col = Number(c.dataset.col)
      if (Number.isFinite(r) && Number.isFinite(col) && r >= 0 && r < size && col >= 0 && col < size) {
        const v = c.dataset.value
        at[r][col] = v === undefined || v === '' ? null : Number(v)
      }
    }
    return at
  }, 4)
}

const fmt = (b: (number | null)[][]) => b.map((r) => '[' + r.map((v) => (v === null ? '.' : String(v))).join(',') + ']').join(' ')
const score = async (page: import('@playwright/test').Page) =>
  (await page.evaluate(() => document.querySelector('#root')?.innerText.match(/Score: \d+/)?.[0])) ?? '?'

test('A2 trace', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(300)
  console.log('START', fmt(await board(page)), await score(page))
  for (let i = 1; i <= 7; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(120)
    console.log(`R${i}`, fmt(await board(page)), await score(page))
  }
  const at = await board(page)
  console.log('at[0][0]=', at[0][0], 'edgeRow(2,col3,row0) has2=', at[0][3] === 2)
})
