import { expect, test } from '@playwright/test'

async function startGame(page: import('@playwright/test').Page, seed: string) {
  await page.getByLabel('Seed').fill(seed)
  await page.getByRole('button', { name: 'New game' }).click()
}

async function selectRowPegs(page: import('@playwright/test').Page, row: number, colors: string[]) {
  for (let i = 1; i <= 4; i++) {
    await page.getByLabel(new RegExp(`row ${row} peg ${i}`, 'i')).selectOption(colors[i - 1])
  }
}

test('[A1] initial page shows heading, controls, and best score', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Mastermind Game' })).toBeVisible()
  await expect(page.getByLabel('Seed')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New game' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Undo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Redo' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copy result' })).toBeVisible()
  await expect(page.getByText('Best score: 0')).toBeVisible()
})

test('[A2] New game with Seed 1 shows empty board and zero guesses', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '1')
  await expect(page.getByText('Guesses: 0')).toBeVisible()
  // four rows, each with four empty peg slots
  const pegs = page.getByLabel(/peg/i)
  await expect(pegs).toHaveCount(16)
  await expect(pegs).toHaveValue('')
})

test('[A3] row 1 all Red submits as 0 exact, 0 partial and increments guesses', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '1')
  await selectRowPegs(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByText('0 exact, 0 partial')).toBeVisible()
  await expect(page.getByText('Guesses: 1')).toBeVisible()
})

test('[A4] winning with Seed 1 shows feedback and win text', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '1')
  await selectRowPegs(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRowPegs(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByText('4 exact, 0 partial')).toBeVisible()
  await expect(page.getByText('You win in 2 guesses')).toBeVisible()
})

test('[A5] Copy result after winning shows toast and clipboard contents', async ({ page, context }) => {
  await page.goto('/')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: new URL(page.url()).origin,
  })
  await startGame(page, '1')
  await selectRowPegs(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRowPegs(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Result copied')).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('Seed 1: Red, Blue, Green, Yellow - 2 guesses')
})

test('[A6] New game with Seed 2 resets board and best score is visible', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '1')
  await selectRowPegs(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRowPegs(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await startGame(page, '2')
  await expect(page.getByText('Guesses: 0')).toBeVisible()
  const pegs = page.getByLabel(/peg/i)
  await expect(pegs).toHaveCount(16)
  await expect(pegs).toHaveValue('')
  await expect(page.getByText('Best score: 2')).toBeVisible()
})

test('[A7] row 1 with Seed 2 submits as 0 exact, 0 partial and increments guesses', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '2')
  await selectRowPegs(page, 1, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await expect(page.getByText('0 exact, 0 partial')).toBeVisible()
  await expect(page.getByText('Guesses: 1')).toBeVisible()
})

test('[A8] Undo clears the guess and Redo restores it', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '1')
  await selectRowPegs(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Guesses: 0')).toBeVisible()
  await expect(page.getByLabel(new RegExp('row 1 peg', 'i'))).toHaveValue('')
  await expect(page.getByText('0 exact, 0 partial')).toHaveCount(0)
  await page.getByRole('button', { name: 'Redo' }).click()
  await expect(page.getByText('Guesses: 1')).toBeVisible()
  await expect(page.getByText('0 exact, 0 partial')).toBeVisible()
})

test('[A9] reloading the page keeps the best score', async ({ page }) => {
  await page.goto('/')
  await startGame(page, '1')
  await selectRowPegs(page, 1, ['Red', 'Red', 'Red', 'Red'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await selectRowPegs(page, 2, ['Red', 'Blue', 'Green', 'Yellow'])
  await page.getByRole('button', { name: 'Submit guess' }).click()
  await page.reload()
  await expect(page.getByText('Best score: 2')).toBeVisible()
})
