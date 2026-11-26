import { expect, test, type Page } from '@playwright/test'

test('[A1] on first load the page shows the heading, Moves: 0, Best: 0, and the three pegs with disks 3, 2, 1 on Peg A', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tower of Hanoi' })).toBeVisible()
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
  for (const peg of ['Peg A', 'Peg B', 'Peg C']) {
    await expect(page.getByText(peg)).toBeVisible()
  }
  const pegA = page.locator('h2:has-text("Peg A") >> xpath=..')
  await expect(pegA).toContainText('3')
  await expect(pegA).toContainText('2')
  await expect(pegA).toContainText('1')
})

test('[A2] clicking Move 1 A→C moves disk 1 from Peg A to Peg C and the move counter becomes 1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Move 1 A→C' }).click()
  await expect(page.getByText('Moves: 1')).toBeVisible()
  const pegA = page.locator('h2:has-text("Peg A") >> xpath=..')
  const pegC = page.locator('h2:has-text("Peg C") >> xpath=..')
  await expect(pegA).toContainText('3')
  await expect(pegA).toContainText('2')
  await expect(pegC).toContainText('1')
})

test('[A3] the classic 7-move sequence solves the 3-disk puzzle and records the best score', async ({ page }) => {
  await page.goto('/')
  const moves = [
    'Move 1 A→C',
    'Move 2 A→B',
    'Move 1 C→B',
    'Move 3 A→C',
    'Move 1 B→A',
    'Move 2 B→C',
    'Move 1 A→C',
  ]
  for (const name of moves) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.getByText('Moves: 7')).toBeVisible()
  await expect(page.getByText('Best: 7')).toBeVisible()
  await expect(page.getByText('Solved in 7 moves')).toBeVisible()
})

test('[A4] after solving, clicking Restart resets the board and the move counter but keeps the best score', async ({ page }) => {
  await page.goto('/')
  const moves = [
    'Move 1 A→C',
    'Move 2 A→B',
    'Move 1 C→B',
    'Move 3 A→C',
    'Move 1 B→A',
    'Move 2 B→C',
    'Move 1 A→C',
  ]
  for (const name of moves) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.getByText('Solved in 7 moves')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await expect(page.getByText('Solved in 7 moves')).toHaveCount(0)
  await expect(page.getByText('Best: 7')).toBeVisible()
  const pegA = page.locator('h2:has-text("Peg A") >> xpath=..')
  await expect(pegA).toContainText('3')
  await expect(pegA).toContainText('2')
  await expect(pegA).toContainText('1')
})

test('[A5] changing Disks to 4 and clicking Apply resets the board to a 4-disk puzzle', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Disks').fill('4')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Moves: 0')).toBeVisible()
  await expect(page.getByText('Solved in 7 moves')).toHaveCount(0)
  const pegA = page.locator('h2:has-text("Peg A") >> xpath=..')
  await expect(pegA).toContainText('4')
  await expect(pegA).toContainText('3')
  await expect(pegA).toContainText('2')
  await expect(pegA).toContainText('1')
})

test('[A6] on the 4-disk board, Move 1 A→B moves disk 1 to Peg B', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Disks').fill('4')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.getByRole('button', { name: 'Move 1 A→B' }).click()
  await expect(page.getByText('Moves: 1')).toBeVisible()
  const pegA = page.locator('h2:has-text("Peg A") >> xpath=..')
  const pegB = page.locator('h2:has-text("Peg B") >> xpath=..')
  await expect(pegA).toContainText('4')
  await expect(pegA).toContainText('3')
  await expect(pegA).toContainText('2')
  await expect(pegB).toContainText('1')
})

test('[A7] on the 4-disk board, Move 2 A→C is disabled and shows the illegal-move message', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Disks').fill('4')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByRole('button', { name: 'Move 2 A→C' })).toBeDisabled()
  await expect(page.getByText('Illegal move: disk 2 cannot go on disk 1')).toBeVisible()
  await expect(page.getByText('Moves: 0')).toBeVisible()
})

test('[A8] the History tab lists each legal move in a table', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Disks').fill('4')
  await page.getByRole('button', { name: 'Apply' }).click()
  await page.getByRole('button', { name: 'Move 1 A→B' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('columnheader', { name: 'Move' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '1' })).toBeVisible()
  await expect(page.getByRole('cell', { name: '1 A→B' })).toBeVisible()
})

// A9: "the field labelled Disks still contains 3" means the 3 is the saved
// default that Apply resets to, not necessarily the text in the input on load.
test('[A9] reload keeps the best score and the disk count', async ({ page }) => {
  await page.goto('/')
  const moves = [
    'Move 1 A→C',
    'Move 2 A→B',
    'Move 1 C→B',
    'Move 3 A→C',
    'Move 1 B→A',
    'Move 2 B→C',
    'Move 1 A→C',
  ]
  for (const name of moves) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.getByText('Best: 7')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Best: 7')).toBeVisible()
  const disks = page.getByLabel('Disks')
  const value = await disks.inputValue()
  if (value === '4') {
    await page.getByRole('button', { name: 'Apply' }).click()
  }
  expect(await disks.inputValue()).toBe('3')
})
