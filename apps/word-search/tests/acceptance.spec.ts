import { expect, test, type Page, type Locator } from '@playwright/test'

async function generate(page: Page, words: string, size?: number) {
  if (size !== undefined) await page.getByLabel('Size').fill(String(size))
  await page.getByLabel('Words').fill(words)
  await page.getByRole('button', { name: 'Generate' }).click()
}

async function findCells(page: Page): Promise<Locator[]> {
  return page.getByRole('grid', { name: 'Puzzle' }).getByRole('gridcell').all()
}

// Find a straight line of the given word among the 8 word-search directions.
// Returns the aria-labels of the first and last cell of the line, or null.
async function findWordLine(page: Page, word: string): Promise<[string, string] | null> {
  const cells = await findCells(page)
  const labelByCoord = new Map<string, string>()
  const letterByCoord = new Map<string, string>()
  for (const cell of cells) {
    const label = await cell.getAttribute('aria-label')
    if (!label) continue
    const m = label.match(/^Row (\d+), column (\d+): /)
    if (!m) continue
    const key = `${m[1]},${m[2]}`
    labelByCoord.set(key, label)
    letterByCoord.set(key, (await cell.textContent())?.trim() ?? '')
  }
  const inBounds = (r: number, c: number) => {
    const key = `${r},${c}`
    return labelByCoord.has(key)
  }
  const directions: Array<[number, number]> = [
    [0, 1],
    [1, 0],
    [1, 1],
    [-1, 1],
    [0, -1],
    [-1, 0],
    [-1, -1],
    [1, -1],
  ]
  for (const key of labelByCoord.keys()) {
    const m = key.match(/^(\d+),(\d+)$/)!
    const startR = Number(m[1])
    const startC = Number(m[2])
    for (const [dr, dc] of directions) {
      let ok = true
      let lastKey: string | null = null
      for (let i = 0; i < word.length; i++) {
        const r = startR + dr * i
        const c = startC + dc * i
        const k = `${r},${c}`
        if (!inBounds(r, c) || letterByCoord.get(k) !== word[i]) {
          ok = false
          break
        }
        lastKey = k
      }
      if (ok && lastKey) return [labelByCoord.get(key)!, labelByCoord.get(lastKey)!]
    }
  }
  return null
}

async function clickWord(page: Page, word: string) {
  const line = await findWordLine(page, word)
  if (!line) throw new Error(`word ${word} not found in the grid`)
  await page.getByRole('gridcell', { name: line[0] }).click()
  await page.getByRole('gridcell', { name: line[1] }).click()
}

test('[A1] initial page shows heading and "No puzzle loaded"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Word Search' })).toBeVisible()
  await expect(page.getByText('No puzzle loaded')).toBeVisible()
})

test('[A2] generating CAT,DOG creates a 10x10 grid and "Find 2 words"', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'CAT,DOG')
  const grid = page.getByRole('grid', { name: 'Puzzle' })
  await expect(grid).toBeVisible()
  const cells = await findCells(page)
  expect(cells.length).toBe(100)
  await expect(page.getByText('Find 2 words')).toBeVisible()
  await expect(page.getByText('No puzzle loaded')).toHaveCount(0)
})

test('[A3] clicking the start and end of CAT finds the word and scores 10', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'CAT,DOG')
  await clickWord(page, 'CAT')
  const found = page.getByRole('list', { name: 'Found words' })
  await expect(found.getByText('CAT')).toBeVisible()
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A4] Restart clears found words, resets the score and regenerates the puzzle', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'CAT,DOG')
  await clickWord(page, 'CAT')
  await expect(page.getByText('Score: 10')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('list', { name: 'Found words' }).getByText('CAT')).toHaveCount(0)
  await expect(page.getByText('Score: 0')).toBeVisible()
  const cells = await findCells(page)
  expect(cells.length).toBe(100)
})

test('[A5] the Stats tab shows Best Score at least as high as the Play score', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'CAT,DOG')
  await clickWord(page, 'CAT')
  await expect(page.getByText('Score: 10')).toBeVisible()
  await page.getByRole('tab', { name: 'Stats' }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('cell', { name: 'Best Score' })).toBeVisible()
  const rows = await table.locator('tr').all()
  let valueRow: Locator | null = null
  for (const r of rows) {
    if ((await r.innerText()).includes('Best Score')) {
      valueRow = r
      break
    }
  }
  if (!valueRow) throw new Error('Best Score row not found')
  const value = Number(await valueRow.locator('td').last().innerText())
  expect(value).toBeGreaterThanOrEqual(10)
})

test('[A6] the found word and score survive a reload', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'CAT,DOG')
  await clickWord(page, 'CAT')
  await expect(page.getByText('Score: 10')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('list', { name: 'Found words' }).getByText('CAT')).toBeVisible()
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A7] Copy Puzzle copies the grid letters and briefly shows "Copied"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await generate(page, 'CAT,DOG')
  await page.getByRole('button', { name: 'Copy Puzzle' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip.length).toBe(100)
})

test('[A8] generating with size 15 creates a 15x15 grid', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'CAT,DOG', 15)
  const cells = await findCells(page)
  expect(cells.length).toBe(225)
})
