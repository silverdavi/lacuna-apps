import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] initial load shows heading, turn indicator, and score line', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Tic Tac Toe' })).toBeVisible()
  await expect(page.getByText("Player X's turn")).toBeVisible()
  await expect(page.getByText('X: 0, O: 0, Draws: 0')).toBeVisible()
})

test('[A2] clicking the first cell places an X and switches the turn to O', async ({ page }) => {
  const cell = page.getByRole('button', { name: 'Player X to play in row 1, column 1' })
  await cell.click()
  await expect(page.getByRole('cell', { name: 'X, row 1, column 1' })).toContainText('X')
  await expect(page.getByText("Player O's turn")).toBeVisible()
})

test('[A3] a winning line declares Player X wins and updates the score', async ({ page }) => {
  await page.getByRole('button', { name: 'Player X to play in row 1, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 3' }).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await expect(page.getByText('X: 1, O: 0, Draws: 0')).toBeVisible()
})

test('[A4] after a win the board is locked', async ({ page }) => {
  await page.getByRole('button', { name: 'Player X to play in row 1, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 3' }).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await page.getByRole('cell', { name: 'empty, row 1, column 2' }).click()
  await expect(page.getByRole('cell', { name: 'empty, row 1, column 2' })).toBeVisible()
  await expect(page.getByText("Player O's turn")).toHaveCount(0)
  await expect(page.getByText('Player X wins')).toBeVisible()
})

test('[A5] Restart after a win clears the board but keeps the score', async ({ page }) => {
  await page.getByRole('button', { name: 'Player X to play in row 1, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 3' }).click()
  await expect(page.getByText('Player X wins')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('cell', { name: 'X, row 1, column 1' })).toHaveCount(0)
  await expect(page.getByText("Player X's turn")).toBeVisible()
  await expect(page.getByText('X: 1, O: 0, Draws: 0')).toBeVisible()
})

test('[A6] a full board with no winner declares a Draw', async ({ page }) => {
  await page.getByRole('button', { name: 'Player X to play in row 1, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 1, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 1, column 3' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 1' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 2, column 2' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 3' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 3, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 3' }).click()
  await expect(page.getByText('Draw')).toBeVisible()
  await expect(page.getByText('X: 0, O: 0, Draws: 1')).toBeVisible()
})

test('[A7] Reset Scores after a draw clears the score line and the board', async ({ page }) => {
  await page.getByRole('button', { name: 'Player X to play in row 1, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 1, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 1, column 3' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 1' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 2, column 2' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 2, column 3' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 3, column 2' }).click()
  await page.getByRole('button', { name: 'Player X to play in row 3, column 3' }).click()
  await expect(page.getByText('Draw')).toBeVisible()
  await page.getByRole('button', { name: 'Reset Scores' }).click()
  await expect(page.getByText('X: 0, O: 0, Draws: 0')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'X, row 1, column 1' })).toHaveCount(0)
})

test('[A8] pressing number keys places marks in the matching cells', async ({ page }) => {
  await page.getByRole('cell', { name: 'empty, row 1, column 1' }).focus()
  await page.keyboard.press('1')
  await expect(page.getByRole('cell', { name: 'X, row 1, column 1' })).toContainText('X')
  await page.getByRole('cell', { name: 'empty, row 2, column 2' }).focus()
  await page.keyboard.press('5')
  await expect(page.getByRole('cell', { name: 'O, row 2, column 2' })).toContainText('O')
})

test('[A9] reloading keeps the board and the score', async ({ page }) => {
  await page.getByRole('button', { name: 'Player X to play in row 1, column 1' }).click()
  await page.getByRole('button', { name: 'Player O to play in row 1, column 2' }).click()
  await page.reload()
  await expect(page.getByRole('cell', { name: 'X, row 1, column 1' })).toContainText('X')
  await expect(page.getByRole('cell', { name: 'O, row 1, column 2' })).toContainText('O')
  await expect(page.getByText("Player X's turn")).toBeVisible()
  await expect(page.getByText('X: 0, O: 0, Draws: 0')).toBeVisible()
})
