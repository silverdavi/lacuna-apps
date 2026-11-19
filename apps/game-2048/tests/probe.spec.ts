import { expect, test, type Page } from '@playwright/test'

const KEY = 'lacuna.game-2048.game-state.v1'

// Reads the 4x4 board as a matrix of tile values (null where a cell is empty).
type Board = (number | null)[][]
async function board(page: Page): Promise<Board> {
  return page.evaluate((size) => {
    const cells = Array.from(document.querySelectorAll('[data-cell]'))
    const at: Board = Array.from({ length: size }, () => Array(size).fill(null))
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

const key = (page: Page, k: string) => page.keyboard.press(k)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

test('[P1] fresh visit starts with a clean board', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
  const at = await board(page)
  const vals = at.flat().filter((v): v is number => v !== null)
  expect(vals).toEqual([2, 2])
})

test('[P2] the app never writes to storage without a key press', async ({ page }) => {
  const before = await page.evaluate(() => localStorage.getItem(KEY))
  await page.goto('/')
  await sleep(1500)
  const after = await page.evaluate(() => localStorage.getItem(KEY))
  if (before === null) {
    expect(after, 'no storage write on a clean load').toBeNull()
  } else {
    expect(after, 'an untouched page leaves storage alone').toBe(before)
  }
})

test('[P3] state survives a reload within the same session', async ({ page }) => {
  await page.goto('/')
  for (let i = 0; i < 3; i++) await key(page, 'ArrowRight')
  const stored = await page.evaluate((k) => localStorage.getItem(k), KEY)
  expect(stored, 'a move is persisted').not.toBeNull()
  await page.reload()
  await expect(page.getByText('2048 Game')).toBeVisible()
  const again = await page.evaluate((k) => localStorage.getItem(k), KEY)
  expect(again, 'reload keeps the stored state').toBe(stored)
})

test('[P4] a merge keeps working across reloads', async ({ page }) => {
  await page.goto('/')
  let score = 0
  for (let i = 0; i < 200 && score < 4; i++) {
    await key(page, 'ArrowRight')
    score = parseInt((await page.getByText(/Score:\s*\d+/).innerText()).replace(/\D/g, ''), 10)
  }
  expect(score, 'reached the first merge before reloading').toBeGreaterThanOrEqual(4)
  await page.reload()
  const after = parseInt((await page.getByText(/Score:\s*\d+/).innerText()).replace(/\D/g, ''), 10)
  expect(after, 'the score survived the reload').toBe(score)
})
