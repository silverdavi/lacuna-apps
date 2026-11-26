import { expect, test, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await page.clock.pauseAt(new Date('2026-01-01T09:01:00'))
}

const grid = (page: Page) => page.getByRole('grid', { name: 'Board', exact: true })
const cell = (page: Page, row: number, col: number) =>
  page.getByRole('gridcell', { name: `Row ${row}, Column ${col}`, exact: true })
const timer = (page: Page) => page.getByRole('timer', { name: 'Time', exact: true })

async function newGame(page: Page, difficulty: 'Practice' | 'Easy' | 'Hard') {
  await page.getByLabel('Difficulty', { exact: true }).selectOption(difficulty)
  await page.getByRole('button', { name: 'New Game', exact: true }).click()
}

async function digit(page: Page, n: number) {
  await page.getByRole('button', { name: String(n), exact: true }).click()
}

async function place(page: Page, row: number, col: number, n: number) {
  await cell(page, row, col).click()
  await digit(page, n)
}

test('[A1] on load the heading, the Difficulty select with Easy, New Game, and the timer 00:00 are shown', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sudoku Puzzle', exact: true })).toBeVisible()
  await expect(page.getByLabel('Difficulty', { exact: true })).toBeVisible()
  await expect(page.getByLabel('Difficulty', { exact: true })).toHaveValue('Easy')
  await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible()
  const t = timer(page)
  await expect(t).toBeVisible()
  await expect(t).toHaveText('00:00')
})

test('[A2] a Practice game shows 1 in Row 1 Column 1, an empty Row 1 Column 2, and timer 00:00', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await expect(cell(page, 1, 1)).toHaveText('1')
  await expect(cell(page, 1, 2)).toHaveText('')
  await expect(timer(page)).toHaveText('00:00')
})

test('[A3] a given cell cannot be changed', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await cell(page, 1, 1).click()
  await digit(page, 5)
  await expect(cell(page, 1, 1)).toHaveText('1')
})

test('[A4] the correct digit goes into the selected empty cell', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await place(page, 1, 2, 2)
  await expect(cell(page, 1, 2)).toHaveText('2')
})

test('[A5] the running timer counts up', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await page.clock.fastForward(1000)
  await expect(timer(page)).toHaveText('00:01')
  await page.clock.fastForward(2000)
  await expect(timer(page)).toHaveText('00:03')
})

test('[A6] a Hard game leaves at least 30 empty cells', async ({ page }) => {
  await open(page)
  await newGame(page, 'Hard')
  let empty = 0
  for (let r = 1; r <= 9; r++) {
    for (let c = 1; c <= 9; c++) {
      const text = await cell(page, r, c).textContent()
      if ((text ?? '').trim() === '') empty++
    }
  }
  expect(empty).toBeGreaterThanOrEqual(30)
})

test('[A7] solving the Practice board shows Puzzle Solved and stops the timer', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await place(page, 1, 2, 2)
  await place(page, 2, 5, 8)
  await place(page, 5, 5, 9)
  await place(page, 9, 9, 8)
  await expect(page.getByText('Puzzle Solved', { exact: true })).toBeVisible()
  const frozen = await timer(page).textContent()
  await page.clock.fastForward(5000)
  expect(await timer(page).textContent()).toBe(frozen)
})

test('[A8] a repeated digit in the row marks the cell invalid and shows Invalid move', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await place(page, 1, 2, 1)
  await expect(cell(page, 1, 2)).toHaveAttribute('aria-invalid', 'true')
  await expect(page.getByText('Invalid move', { exact: true })).toBeVisible()
})

test('[A9] a reload keeps the entered value and the other empty cell stays empty', async ({ page }) => {
  await open(page)
  await newGame(page, 'Practice')
  await place(page, 1, 2, 2)
  await page.reload()
  await expect(cell(page, 1, 2)).toHaveText('2')
  await expect(cell(page, 2, 5)).toHaveText('')
})
