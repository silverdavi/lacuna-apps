import { expect, test, type Locator, type Page } from '@playwright/test'

// Reads the puzzle as a 2-D matrix of letters from the DOM, without assuming
// any particular cell labelling scheme.
async function readGrid(page: Page): Promise<string[][]> {
  const rows = await page.locator('[role="row"]').all()
  const grid: string[][] = []
  for (const row of rows) {
    const cells = await row.locator('[role="gridcell"]').all()
    grid.push(cells.map((c) => (c.textContent() ?? '').trim().toUpperCase()))
  }
  return grid
}

// Locates the gridcell at 0-indexed (row, col) as the n-th cell of the n-th row.
const cellAt = (page: Page, row: number, col: number) =>
  page.locator('[role="row"]').nth(row).locator('[role="gridcell"]').nth(col)

// Finds one straight (row, column, or diagonal) occurrence of `word` in the
// puzzle and returns the locators of its first and last cells.
async function findWord(page: Page, word: string): Promise<{ start: Locator; end: Locator }> {
  const grid = await readGrid(page)
  const dirs: Array<[number, number]> = [
    [0, 1], [0, -1],
    [1, 0], [-1, 0],
    [1, 1], [1, -1],
    [-1, 1], [-1, -1],
  ]
  const h = grid.length
  const w = grid[0]?.length ?? 0
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      for (const [dr, dc] of dirs) {
        let ok = true
        for (let i = 0; i < word.length; i++) {
          const nr = r + dr * i
          const nc = c + dc * i
          if (nr < 0 || nr >= h || nc < 0 || nc >= w || grid[nr][nc] !== word[i]) {
            ok = false
            break
          }
        }
        if (ok) {
          return {
            start: cellAt(page, r, c),
            end: cellAt(page, r + dr * (word.length - 1), c + dc * (word.length - 1)),
          }
        }
      }
    }
  }
  throw new Error(`could not find ${word} in the puzzle`)
}

// A person finds a word by clicking its first letter and its last letter.
async function selectWord(page: Page, word: string) {
  const { start, end } = await findWord(page, word)
  await start.click()
  await end.click()
}

const generate = async (page: Page, words = 'CAT,DOG') => {
  await page.goto('/')
  await page.getByLabel('Words').fill(words)
  await page.getByRole('button', { name: 'Generate' }).click()
}

test('[A1] the page shows the "Word Search" heading and "No puzzle loaded"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Word Search' })).toBeVisible()
  await expect(page.getByText('No puzzle loaded')).toBeVisible()
})

test('[A2] typing "CAT,DOG" and clicking Generate creates a 10x10 grid and shows "Find 2 words" instead of "No puzzle loaded"', async ({
  page,
}) => {
  await generate(page)
  await expect(page.getByText('No puzzle loaded')).toHaveCount(0)
  await expect(page.getByText('Find 2 words')).toBeVisible()
  const grid = await readGrid(page)
  expect(grid.length, 'a 10x10 grid has 10 rows').toBe(10)
  expect(grid[0].length, 'a 10x10 grid has 10 columns').toBe(10)
  // The letters C, A, T appear consecutively in a row, column, or diagonal.
  const { start } = await findWord(page, 'CAT')
  await expect(start).toBeVisible()
})

test('[A3] selecting C through T adds CAT to the found words and shows "Score: 10"', async ({
  page,
}) => {
  await generate(page)
  await selectWord(page, 'CAT')
  await expect(page.getByText('CAT', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A4] Restart clears the found words list, resets the score to "Score: 0", and regenerates a new puzzle', async ({
  page,
}) => {
  await generate(page)
  await selectWord(page, 'CAT')
  await expect(page.getByText('Score: 10')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Score: 0')).toBeVisible()
  // The found words list is cleared: CAT is no longer listed as found.
  await expect(page.getByText('Find 2 words')).toBeVisible()
  // A new puzzle is generated with the same words: CAT is findable again.
  await selectWord(page, 'CAT')
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A5] the Stats tab shows a "Best Score" of at least the current Score', async ({ page }) => {
  await generate(page)
  await selectWord(page, 'CAT')
  await page.getByRole('button', { name: 'Stats' }).click()
  await expect(page.getByText('Best Score', { exact: true })).toBeVisible()
  // The Stats table lists the best score as a number at least as high as the
  // current score (10).
  const bestText = await page.getByText('Best Score', { exact: true }).locator('xpath=following-sibling::*[1]').innerText()
  expect(bestText, 'the value next to Best Score').toMatch(/\d+/)
  expect(Number(bestText.match(/\d+/)![0])).toBeGreaterThanOrEqual(10)
})

test('[A6] a reload keeps CAT in the found words list and "Score: 10"', async ({ page }) => {
  await generate(page)
  await selectWord(page, 'CAT')
  await expect(page.getByText('Score: 10')).toBeVisible()
  await page.reload()
  await expect(page.getByText('CAT', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A7] Copy Puzzle copies the grid letters to the clipboard and shows "Copied" briefly', async ({
  page,
  context,
}) => {
  await generate(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy Puzzle' }).click()
  await expect(page.getByText('Copied', { exact: true })).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  // The clipboard holds the grid letters: 100 uppercase A-Z letters.
  const letters = text.replace(/[^A-Z]/gi, '')
  expect(letters.length, 'the clipboard holds the 100 grid letters').toBe(100)
})

test('[A8] setting Size to 15 and clicking Generate creates a 15x15 grid', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Words').fill('CAT,DOG')
  await page.getByLabel('Size').fill('15')
  await page.getByRole('button', { name: 'Generate' }).click()
  const grid = await readGrid(page)
  expect(grid.length, 'a 15x15 grid has 15 rows').toBe(15)
  expect(grid[0].length, 'a 15x15 grid has 15 columns').toBe(15)
})
