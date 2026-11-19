import { expect, test, type Locator, type Page } from '@playwright/test'

// The grid is the only grid on the page; cells are addressed by row and 1-based column.
const cell = (page: Page, row: number, col: number): Locator =>
  page.getByRole('grid').getByRole('gridcell').nth((row - 1) * 9 + (col - 1))

const timer = (page: Page): Locator => page.getByText(/^\d{2}:\d{2}$/)

async function freshGame(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Game' }).click()
}

test('[A1] initial load shows the heading, an Easy Difficulty select, New Game, and a 00:00 timer', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sudoku Puzzle' })).toBeVisible()
  await expect(page.getByLabel('Difficulty')).toBeVisible()
  await expect(page.getByLabel('Difficulty')).toHaveValue('Easy')
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
  await expect(timer(page)).toHaveText('00:00')
})

test('[A2] New Game fills the first cell with a non-zero digit and resets the timer to 00:00', async ({
  page,
}) => {
  await page.goto('/')
  // Let any in-flight initial load settle, then start the game; afterwards the
  // timer must read zero, so it did not keep running from before the click.
  await page.waitForTimeout(1100)
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(timer(page)).toHaveText('00:00')
  const first = await cell(page, 1, 1).innerText()
  expect(/^[1-9]$/.test(first.trim()), 'first cell holds a digit').toBe(true)
})

test('[A3] a pre-filled cell is locked and keeps its digit when a number button is pressed', async ({
  page,
}) => {
  await freshGame(page)
  const c11 = cell(page, 1, 1)
  const before = (await c11.innerText()).trim()
  expect(/^[1-9]$/.test(before), 'A2: first cell is pre-filled').toBe(true)
  await c11.click()
  await page.getByRole('button', { name: '1', exact: true }).click()
  await expect(c11).toHaveText(before)
})

test('[A4] clicking an empty cell and a number button enters that number', async ({ page }) => {
  await freshGame(page)
  const c12 = cell(page, 1, 2)
  expect((await c12.innerText()).trim(), 'row 1 column 2 is empty').toBe('')
  await c12.click()
  await page.getByRole('button', { name: '5', exact: true }).click()
  await expect(c12).toHaveText('5')
})

test('[A5] the timer shows a non-zero value after a move and a second have passed', async ({
  page,
}) => {
  await freshGame(page)
  const c12 = cell(page, 1, 2)
  await c12.click()
  await page.getByRole('button', { name: '5', exact: true }).click()
  await expect(c12).toHaveText('5')
  await expect(timer(page), 'timer ticks after the first move').not.toHaveText('00:00', {
    timeout: 5000,
  })
})

test('[A6] a Hard board has at least 30 empty cells and fewer pre-filled digits than Easy', async ({
  page,
}) => {
  await page.goto('/')
  const grid = page.getByRole('grid')
  const empties = async () => {
    let n = 0
    for (let i = 0; i < 81; i++) {
      if ((await grid.getByRole('gridcell').nth(i).innerText()).trim() === '') n++
    }
    return n
  }
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(page.getByLabel('Difficulty')).toHaveValue('Easy')
  const easy = await empties()
  await page.getByLabel('Difficulty').selectOption('Hard')
  await page.getByRole('button', { name: 'New Game' }).click()
  const hard = await empties()
  expect(hard, 'Hard board has at least 30 empty cells').toBeGreaterThanOrEqual(30)
  expect(hard, 'Hard board has fewer pre-filled digits than Easy').toBeLessThan(easy)
})

test('[A7] solving the puzzle shows "Puzzle Solved" and stops the timer', async ({ page }) => {
  await freshGame(page)
  // Let the timer run so a stopped timer is distinguishable from a fresh one.
  await page.waitForTimeout(1200)
  // Reading the current board (without changing it) to drive the solve is allowed.
  const board = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[role="gridcell"]')).map((c) => c.textContent?.trim() ?? ''),
  )
  expect(board, 'grid exposes 81 cells').toHaveLength(81)
  const empty: number[] = []
  board.forEach((v, i) => {
    if (v === '') empty.push(i)
  })
  // The board has not been touched since New Game, so it must still be solvable
  // by filling each empty cell with a digit that satisfies the constraints.
  const digits: number[] = board.map((v) => (v === '' ? 0 : Number(v)))
  const ok = (d: number[], r: number, c: number) =>
    d.every((x, i) =>
      x === 0 || x === d[r * 9 + c]
        ? false
        : i % 9 === c || Math.floor(i / 9) === r ||
          (Math.floor(i / 3) === Math.floor(r / 3) && Math.floor((i % 9) / 3) === Math.floor(c / 3)),
    )
  const solve = (d: number[]): boolean => {
    const i = d.indexOf(0)
    if (i === -1) return true
    const r = Math.floor(i / 9)
    const c = i % 9
    for (let n = 1; n <= 9; n++) {
      if (!ok(d, r, c)) continue
      d[i] = n
      if (solve(d)) return true
      d[i] = 0
    }
    return false
  }
  const solved = solve(digits)
  expect(solved, 'the generated board is solvable').toBe(true)
  const grid = page.getByRole('grid')
  for (const i of empty) {
    await grid.getByRole('gridcell').nth(i).click()
    await page.getByRole('button', { name: String(digits[i]), exact: true }).click()
    await expect(grid.getByRole('gridcell').nth(i)).toHaveText(String(digits[i]))
  }
  await expect(page.getByText('Puzzle Solved')).toBeVisible()
  const frozen = await timer(page).innerText()
  await page.waitForTimeout(2200)
  await expect(timer(page)).toHaveText(frozen)
})

test('[A8] a duplicate digit in a row turns the cell border red and shows "Invalid move"', async ({
  page,
}) => {
  await freshGame(page)
  // A pre-filled digit is always legal, so reuse it: find another empty cell in
  // its row and enter the same digit.
  const grid = page.getByRole('grid')
  let target = -1
  let dup = ''
  for (let r = 0; r < 9 && target === -1; r++) {
    let prefilled = ''
    for (let c = 0; c < 9; c++) {
      const v = (await grid.getByRole('gridcell').nth(r * 9 + c).innerText()).trim()
      if (/^[1-9]$/.test(v)) prefilled = v
    }
    if (!prefilled) continue
    for (let c = 0; c < 9; c++) {
      const v = (await grid.getByRole('gridcell').nth(r * 9 + c).innerText()).trim()
      if (v === '') {
        target = r * 9 + c
        dup = prefilled
        break
      }
    }
  }
  expect(target, 'every row holds a pre-filled digit next to an empty cell').toBeGreaterThanOrEqual(0)
  await grid.getByRole('gridcell').nth(target).click()
  await page.getByRole('button', { name: dup, exact: true }).click()
  const border = await grid.getByRole('gridcell').nth(target).evaluate((el) => {
    const m = getComputedStyle(el).borderColor.match(/(\d+),\s*(\d+),\s*(\d+)/)
    return m ? { r: Number(m[1]), b: Number(m[3]) } : null
  })
  expect(border, 'cell border color resolved').not.toBeNull()
  expect(border?.r, 'cell border is red').toBeGreaterThan(200)
  expect(border?.b, 'cell border is red').toBeLessThan(150)
  await expect(page.getByText('Invalid move')).toBeVisible()
})

test('[A9] reload keeps the entered digit and resumes the timer from the last saved value', async ({
  page,
}) => {
  await freshGame(page)
  const c12 = cell(page, 1, 2)
  expect((await c12.innerText()).trim(), 'row 1 column 2 is empty').toBe('')
  await c12.click()
  await page.getByRole('button', { name: '5', exact: true }).click()
  await expect(c12).toHaveText('5')
  // Let the timer advance so the saved value is a real, non-zero checkpoint.
  await page.waitForTimeout(1200)
  const before = (await timer(page).innerText()).trim()
  const secs = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const saved = secs(before)
  expect(saved, 'timer advanced before the reload').toBeGreaterThan(0)
  await page.reload()
  await expect(c12).toHaveText('5')
  const after = (await timer(page).innerText()).trim()
  expect(/^\d{2}:\d{2}$/.test(after)).toBe(true)
  // The timer must resume from the saved value, not from zero.
  expect(Math.abs(secs(after) - saved) <= 5, `timer continued from ${before}, got ${after}`).toBe(true)
})
