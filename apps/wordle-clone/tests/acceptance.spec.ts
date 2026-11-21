import { expect, test, type Page } from '@playwright/test'

const wins = (page: Page, n: number) => page.getByText(`Wins: ${n}`, { exact: true })

const streak = (page: Page, n: number) => page.getByText(`Best Streak: ${n}`, { exact: true })

const status = (page: Page, text: string) => page.getByText(text, { exact: true })

// Tiles are the board cells of row `row` in DOM order, 0-indexed.
const tile = (page: Page, row: number, col: number) => page.locator('[data-row]').nth(row).locator('[data-letter]').nth(col)

// Asserts that the col-th tile of row carries a "correct" (green) marker.
async function expectTileCorrect(page: Page, row: number, col: number) {
  const t = tile(page, row, col)
  await expect(t).toBeVisible()
  const marker = await t.evaluate((el) => [el.getAttribute('data-state') ?? '', el.className, el.getAttribute('aria-label') ?? ''].join(' '))
  expect(marker, `tile row ${row} col ${col} marked correct`).toMatch(/correct|green|match/i)
}

const newGame = (page: Page) => page.getByRole('button', { name: 'New Game' })

async function open(page: Page) {
  await page.goto('/')
}

async function typeWord(page: Page, word: string) {
  for (const l of word) await page.keyboard.press(l)
  await page.keyboard.press('Enter')
}

async function winWithCrane(page: Page) {
  await open(page)
  await typeWord(page, 'CRANE')
}

test('[A1] the page shows the heading and the tagline', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Wordle Game' })).toBeVisible()
  await expect(page.getByText('Guess the word in 6 tries')).toBeVisible()
})

test('[A2] a fresh game shows the New Game button and clicking it shows Ready', async ({ page }) => {
  await open(page)
  await expect(newGame(page)).toBeVisible()
  await newGame(page).click()
  await expect(status(page, 'Ready')).toBeVisible()
})

test('[A3] typing CRANE and pressing Enter submits it: row 1 shows the letters and status is Try 1', async ({ page }) => {
  await open(page)
  await typeWord(page, 'CRANE')
  const word = 'CRANE'
  for (let i = 0; i < word.length; i++) {
    await expect(tile(page, 0, i)).toHaveText(word[i])
  }
  await expect(status(page, 'Try 1')).toBeVisible()
})

test('[A4] guessing CRANE marks all five tiles of row 1 correct and shows Solved in 1', async ({ page }) => {
  await open(page)
  await typeWord(page, 'CRANE')
  await expect(status(page, 'Solved in 1')).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expectTileCorrect(page, 0, i)
  }
})

// A5 says the button is disabled after a win yet also that clicking it resets;
// testing the reading that agrees with A2, A7 and A9: it resets to Ready.
test('[A5] after a win, New Game resets the board to empty rows and shows Ready', async ({ page }) => {
  await winWithCrane(page)
  await expect(status(page, 'Solved in 1')).toBeVisible()
  await newGame(page).click()
  await expect(status(page, 'Ready')).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expect(tile(page, 0, i)).not.toHaveText('C')
  }
})

test('[A6] winning shows Wins: 1 and Best Streak: 1', async ({ page }) => {
  await winWithCrane(page)
  await expect(wins(page, 1)).toBeVisible()
  await expect(streak(page, 1)).toBeVisible()
})

test('[A7] the second word is APPLE; guessing it shows Solved in 1, Wins: 2 and Best Streak: 2', async ({ page }) => {
  await winWithCrane(page)
  await newGame(page).click()
  await expect(status(page, 'Ready')).toBeVisible()
  await typeWord(page, 'APPLE')
  await expect(status(page, 'Solved in 1')).toBeVisible()
  await expect(wins(page, 2)).toBeVisible()
  await expect(streak(page, 2)).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expectTileCorrect(page, 0, i)
  }
})

test('[A8] a too-short word shows Invalid word and does not update the board', async ({ page }) => {
  await open(page)
  await page.keyboard.press('Q')
  await page.keyboard.press('X')
  await page.keyboard.press('Z')
  await page.keyboard.press('Enter')
  await expect(status(page, 'Invalid word')).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expect(tile(page, 0, i)).not.toHaveText(/Q|X|Z/)
  }
})

test('[A8] a too-long word shows Invalid word and does not update the board', async ({ page }) => {
  await open(page)
  for (const l of 'ABCDEFG') await page.keyboard.press(l)
  await page.keyboard.press('Enter')
  await expect(status(page, 'Invalid word')).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expect(tile(page, 0, i)).not.toHaveText(/A|B|C|D|E|F|G/)
  }
})

test('[A9] after a win and a new game, reload keeps Wins: 1, Best Streak: 1 and an empty board with Ready', async ({ page }) => {
  await winWithCrane(page)
  await expect(wins(page, 1)).toBeVisible()
  await newGame(page).click()
  await expect(status(page, 'Ready')).toBeVisible()
  await page.reload()
  await expect(wins(page, 1)).toBeVisible()
  await expect(streak(page, 1)).toBeVisible()
  await expect(status(page, 'Ready')).toBeVisible()
  for (let i = 0; i < 5; i++) {
    await expect(tile(page, 0, i)).not.toHaveText(/C|R|A|N|E/)
  }
})
