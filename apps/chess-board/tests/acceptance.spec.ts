import { expect, test, type Locator, type Page } from '@playwright/test'

// Standard board orientation: rank 1 is the bottom row of the grid,
// so e2 is row 7 from the top and h8 is the first cell of the top row.
const SQ = {
  a1: [7, 0],
  e2: [7, 4],
  e4: [5, 4],
  e5: [4, 4],
  e7: [2, 4],
  h8: [0, 7],
} as const

const sq = (page: Page, name: keyof typeof SQ): Locator =>
  page.getByRole('gridcell', { name, exact: true })

async function fresh(page: Page) {
  await page.goto('/')
  // Every test starts from the starting position, regardless of mode or prior session state.
  const buttons = page.getByRole('button', { name: 'New Game' })
  if ((await buttons.count()) > 0) await buttons.click()
}

test('[A1] initial load shows the heading, White to move, a1 with a white pawn and h8 with a black rook', async ({
  page,
}) => {
  await fresh(page)
  await expect(page.getByRole('heading', { name: 'Chess Board Game' })).toBeVisible()
  await expect(page.getByText('White to move')).toBeVisible()
  const grid = page.getByRole('grid')
  await expect(grid).toHaveCount(1)
  await expect(grid.getByRole('gridcell')).toHaveCount(64)
  await expect(sq(page, 'a1')).toContainText('white pawn')
  await expect(sq(page, 'h8')).toContainText('black rook')
})

test('[A2] clicking e2 then e4 moves the white pawn and passes the turn to Black', async ({ page }) => {
  await fresh(page)
  await sq(page, 'e2').click()
  await expect(sq(page, 'e2')).toHaveClass(/selected/)
  await sq(page, 'e4').click()
  await expect(page.getByText('Black to move')).toBeVisible()
  await expect(sq(page, 'e2')).not.toContainText('pawn')
  await expect(sq(page, 'e4')).toContainText('white pawn')
})

test('[A3] on Black\'s turn, clicking e7 then e5 moves the black pawn and returns the turn to White', async ({
  page,
}) => {
  await fresh(page)
  await sq(page, 'e2').click()
  await sq(page, 'e4').click()
  await sq(page, 'e7').click()
  await sq(page, 'e5').click()
  await expect(page.getByText('White to move')).toBeVisible()
  await expect(sq(page, 'e7')).not.toContainText('pawn')
  await expect(sq(page, 'e5')).toContainText('black pawn')
})

test('[A4] New Game resets the board to the starting position', async ({ page }) => {
  await fresh(page)
  await sq(page, 'e2').click()
  await sq(page, 'e4').click()
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(page.getByText('White to move')).toBeVisible()
  await expect(sq(page, 'e4')).not.toContainText('pawn')
})

test('[A5] ArrowRight moves focus to the right neighbour and Enter attempts the move from a selected cell', async ({
  page,
}) => {
  await fresh(page)
  await sq(page, 'e2').click()
  const e2 = sq(page, 'e2')
  await expect(e2).toHaveClass(/selected/)
  await e2.press('ArrowRight')
  await expect(sq(page, 'e2')).not.toHaveFocus()
  await expect(page.getByRole('gridcell', { name: 'f2', exact: true })).toHaveFocus()
  // f2 is occupied, so the attempted move must fail and the selection must stay on e2.
  await page.getByRole('gridcell', { name: 'f2', exact: true }).press('Enter')
  await expect(page.getByText('White to move')).toBeVisible()
  await expect(e2).toHaveClass(/selected/)
  await expect(sq(page, 'f2')).not.toContainText('white pawn')
  // e4 is empty and legal, so the attempted move must succeed.
  await e2.press('ArrowRight')
  await page.getByRole('gridcell', { name: 'f2', exact: true }).press('ArrowLeft')
  await page.getByRole('gridcell', { name: 'e2', exact: true }).press('Enter')
  await expect(page.getByText('Black to move')).toBeVisible()
  await expect(sq(page, 'e2')).not.toContainText('pawn')
  await expect(sq(page, 'e4')).toContainText('white pawn')
})

test('[A6] with the computer opponent active, Black replies e7 to e5 within 2 seconds of White\'s e2 to e4', async ({
  page,
}) => {
  await fresh(page)
  await sq(page, 'e2').click()
  await sq(page, 'e4').click()
  await expect(page.getByText('White to move')).toBeVisible({ timeout: 2000 })
  await expect(sq(page, 'e7')).not.toContainText('pawn', { timeout: 2000 })
  await expect(sq(page, 'e5')).toContainText('black pawn', { timeout: 2000 })
})

test('[A7] Undo after e2-e4 and e7-e5 reverts to the starting position with White to move', async ({ page }) => {
  await fresh(page)
  await sq(page, 'e2').click()
  await sq(page, 'e4').click()
  await sq(page, 'e7').click()
  await sq(page, 'e5').click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('White to move')).toBeVisible()
  await expect(sq(page, 'e4')).not.toContainText('pawn')
  await expect(sq(page, 'e5')).not.toContainText('pawn')
  await expect(sq(page, 'e2')).toContainText('white pawn')
  await expect(sq(page, 'e7')).toContainText('black pawn')
})

test('[A8] after e2-e4, reloading the page keeps the pawn on e4, e2 empty and Black to move', async ({
  page,
}) => {
  await fresh(page)
  await sq(page, 'e2').click()
  await sq(page, 'e4').click()
  await page.reload()
  await expect(page.getByText('Black to move')).toBeVisible()
  await expect(sq(page, 'e4')).toContainText('white pawn')
  await expect(sq(page, 'e2')).not.toContainText('pawn')
})
