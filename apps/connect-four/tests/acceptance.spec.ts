import { expect, test, type Page } from '@playwright/test'

// The spec's A3-A5 chain, played literally, cannot produce A5's win (P1's four discs at
// (r1,c4),(r1,c5),(r2,c6),(r1,c7) form no line). Tested as the reading that agrees with
// the goal and the other checks: P1 and P2 alternate in columns 4, 5, 6 (three discs each),
// so P1's next drop in column 7 completes a horizontal four on the bottom row.
async function winSequence(page: Page) {
  for (const col of [4, 4, 5, 5, 6, 6]) await page.getByRole('button', { name: `Drop in column ${col}` }).click()
  await page.getByRole('button', { name: 'Drop in column 7' }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] initial load shows heading, turn indicator, and score line', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Connect Four' })).toBeVisible()
  await expect(page.getByText("Player 1's turn")).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A2] dropping in column 4 places a red disc in the bottom row and switches the turn', async ({ page }) => {
  await page.getByRole('button', { name: 'Drop in column 4' }).click()
  await expect(page.getByText("Player 2's turn")).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A3] two stacked pairs in columns 4 and 5 leaves Player 1 to move with no winner', async ({ page }) => {
  for (const col of [4, 4, 5, 5]) await page.getByRole('button', { name: `Drop in column ${col}` }).click()
  await expect(page.getByText("Player 1's turn")).toBeVisible()
  await expect(page.getByText('Player 1 wins')).toHaveCount(0)
  await expect(page.getByText('Player 2 wins')).toHaveCount(0)
})

test('[A4] a third disc in each of columns 4, 5, and 6 leaves Player 1 to move with no winner', async ({ page }) => {
  for (const col of [4, 4, 5, 5, 6, 6]) await page.getByRole('button', { name: `Drop in column ${col}` }).click()
  await expect(page.getByText("Player 1's turn")).toBeVisible()
  await expect(page.getByText('Player 1 wins')).toHaveCount(0)
  await expect(page.getByText('Player 2 wins')).toHaveCount(0)
})

test('[A5] the fourth disc in column 7 makes Player 1 win and bumps the score', async ({ page }) => {
  await winSequence(page)
  await expect(page.getByText('Player 1 wins')).toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A6] Restart clears the board, resets the turn, and keeps the score', async ({ page }) => {
  await winSequence(page)
  await expect(page.getByText('Player 1 wins')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Player 1 wins')).toHaveCount(0)
  await expect(page.getByText("Player 1's turn")).toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A7] New game clears the board, resets the turn, and resets the score', async ({ page }) => {
  await winSequence(page)
  await expect(page.getByText('Player 1 wins')).toBeVisible()
  await page.getByRole('button', { name: 'New game' }).click()
  await expect(page.getByText('Player 1 wins')).toHaveCount(0)
  await expect(page.getByText("Player 1's turn")).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A8] a full board with no winner declares a Draw and keeps the score', async ({ page }) => {
  // 42 drops that fill the board with no winner (verified by simulation): the result is a
  // checkerboard with column 4 split down the middle, so no horizontal, vertical, or
  // diagonal line of four exists for either player.
  const seq = [1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 5, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7]
  for (const col of seq) await page.getByRole('button', { name: `Drop in column ${col}` }).click()
  await expect(page.getByText('Draw')).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A9] reloading keeps the score, clears the board, and resets the turn', async ({ page }) => {
  await winSequence(page)
  await expect(page.getByText('Score: 1')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Player 1 wins')).toHaveCount(0)
  await expect(page.getByText("Player 1's turn")).toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})
