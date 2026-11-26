import { expect, test, type Page } from '@playwright/test'

// Cells are addressed (row, column), both counted from 1, row 1 at the top.
// Cells are found as buttons named "Row R, Column C" (the spec's cell naming).
const cell = (page: Page, r: number, c: number) => page.getByRole('button', { name: `Row ${r}, Column ${c}` })

const turn = (page: Page, p: 'X' | 'O') => page.getByText(`Player ${p}'s turn`)

const score = (page: Page, x: number, o: number, d: number) => page.getByText(`X: ${x}, O: ${o}, Draws: ${d}`)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] on initial load the page shows the heading, the turn indicator, and the score line', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Tic Tac Toe' })).toBeVisible()
  await expect(turn(page, 'X')).toBeVisible()
  await expect(score(page, 0, 0, 0)).toBeVisible()
})

test('[A2] clicking the cell in row 1, column 1 places an X, switches the turn to O, and the cell is no longer clickable', async ({ page }) => {
  await cell(page, 1, 1).click()
  await expect(cell(page, 1, 1)).toHaveText('X')
  await expect(turn(page, 'O')).toBeVisible()
  await expect(cell(page, 1, 1)).toBeDisabled()
  await cell(page, 1, 1).click()
  await expect(turn(page, 'O')).toBeVisible()
  await expect(cell(page, 1, 2)).toHaveText('')
})

test('[A3] completing the top row displays Player X wins and the updated score line', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 2, 1).click()
  await cell(page, 1, 2).click()
  await cell(page, 2, 2).click()
  await cell(page, 1, 3).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await expect(score(page, 1, 0, 0)).toBeVisible()
})

test('[A4] after a win, clicking an empty cell does not change the board or the result text', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 2, 1).click()
  await cell(page, 1, 2).click()
  await cell(page, 2, 2).click()
  await cell(page, 1, 3).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await cell(page, 3, 3).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await expect(cell(page, 3, 3)).toHaveText('')
  await expect(cell(page, 3, 3)).toBeEnabled()
  await expect(turn(page, 'O')).toHaveCount(0)
})

test('[A5] clicking Restart after a win clears the board, resets the turn to X, and keeps the score line', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 2, 1).click()
  await cell(page, 1, 2).click()
  await cell(page, 2, 2).click()
  await cell(page, 1, 3).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Player X wins')).toHaveCount(0)
  await expect(turn(page, 'X')).toBeVisible()
  await expect(score(page, 1, 0, 0)).toBeVisible()
  for (const [r, c] of [[1, 1], [1, 2], [1, 3], [2, 1], [2, 2], [3, 1], [3, 2], [3, 3]] as const) {
    await expect(cell(page, r, c)).toHaveText('')
  }
})

test('[A6] filling the board with no line of three displays Draw and the updated score line', async ({ page }) => {
  const seq: [number, number][] = [[1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]]
  for (const [r, c] of seq) await cell(page, r, c).click()
  await expect(page.getByText('Draw')).toBeVisible()
  await expect(score(page, 0, 0, 1)).toBeVisible()
})

test('[A7] clicking Reset Scores after a draw sets the score line back to zero and clears the board', async ({ page }) => {
  const seq: [number, number][] = [[1, 1], [1, 2], [1, 3], [2, 2], [2, 1], [2, 3], [3, 2], [3, 1], [3, 3]]
  for (const [r, c] of seq) await cell(page, r, c).click()
  await expect(page.getByText('Draw')).toBeVisible()
  await page.getByRole('button', { name: 'Reset Scores' }).click()
  await expect(score(page, 0, 0, 0)).toBeVisible()
  for (const [r, c] of seq as const) {
    await expect(cell(page, r, c)).toHaveText('')
  }
})

test('[A8] pressing 1 places X in cell (1,1) and pressing 5 places O in cell (2,2)', async ({ page }) => {
  await page.keyboard.press('1')
  await expect(cell(page, 1, 1)).toHaveText('X')
  await expect(turn(page, 'O')).toBeVisible()
  await page.keyboard.press('5')
  await expect(cell(page, 2, 2)).toHaveText('O')
  await expect(turn(page, 'X')).toBeVisible()
})

test('[A9] a reload keeps the score and board state, the turn indicator, and the score line', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 1, 2).click()
  await page.reload()
  await expect(cell(page, 1, 1)).toHaveText('X')
  await expect(cell(page, 1, 2)).toHaveText('O')
  await expect(turn(page, 'X')).toBeVisible()
  await expect(score(page, 0, 0, 0)).toBeVisible()
})

test('[A10] a partial diagonal does not end the round: no wins text and the turn is O', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 2, 2).click()
  await cell(page, 3, 3).click()
  await expect(page.getByText('Player X wins')).toHaveCount(0)
  await expect(page.getByText('Player O wins')).toHaveCount(0)
  await expect(turn(page, 'O')).toBeVisible()
})

test('[A11] completing the anti-diagonal for O displays Player O wins and the updated score line', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 1, 3).click()
  await cell(page, 1, 2).click()
  await cell(page, 2, 2).click()
  await cell(page, 3, 3).click()
  await cell(page, 3, 1).click()
  await expect(page.getByText('Player O wins')).toBeVisible()
  await expect(score(page, 0, 1, 0)).toBeVisible()
})

test('[A12] completing the first column displays Player X wins', async ({ page }) => {
  await cell(page, 1, 1).click()
  await cell(page, 1, 2).click()
  await cell(page, 2, 1).click()
  await cell(page, 2, 2).click()
  await cell(page, 3, 1).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
})
