import { expect, test, type Page } from '@playwright/test'

// A seeded maze renders as an ARIA grid of named cells: "Row 0, Column 0", ...
// Start and Finish cells are named after their spec role, so cell names come
// from the spec's own wording ("marked Start", "cell ... (Finish)").
const cell = (page: Page, row: number, col: number, name?: string) => {
  const loc = page.getByRole('gridcell', { name: `Row ${row}, Column ${col}`, exact: true })
  if (name) return loc.and(page.getByRole('button', { name, exact: true }))
  return loc
}

async function open(page: Page) {
  await page.goto('/')
}

async function generate(page: Page, seed: string, size = '5x5') {
  await page.getByLabel('Seed', { exact: true }).fill(seed)
  await page.getByLabel('Size', { exact: true }).selectOption(size)
  await page.getByRole('button', { name: 'Generate', exact: true }).click()
}

// An open maze cell is clickable, so it presents itself as a button; a wall
// is not. This is asserted through the accessible role rather than styling.
async function isWall(page: Page, row: number, col: number): Promise<boolean> {
  const c = page.getByRole('gridcell', { name: `Row ${row}, Column ${col}`, exact: true })
  return (await c.locator('button').count()) === 0
}

test('[A1] on load the heading, the empty state, and the score are shown', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Maze Generator', exact: true })).toBeVisible()
  await expect(page.getByText('No maze generated yet', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A2] seed 42 at 5x5 generates a maze with an open (1,1) cell and a Start at (0,0)', async ({ page }) => {
  await open(page)
  await generate(page, '42')
  await expect(cell(page, 1, 1)).toBeVisible()
  expect(await isWall(page, 1, 1), 'cell (1,1) of the seed-42 maze is open').toBe(false)
  await expect(cell(page, 0, 0, 'Start')).toBeVisible()
})

test('[A3] a partial path shows the path count without scoring', async ({ page }) => {
  await open(page)
  await generate(page, '42')
  await cell(page, 0, 0, 'Start').click()
  await cell(page, 0, 1).click()
  await expect(page.getByText('Path: 2', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A4] the seeded solution path solves the maze and scores 1', async ({ page }) => {
  await open(page)
  await generate(page, '42')
  const path = [
    [0, 0, 'Start'],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 2],
    [2, 3],
    [3, 3],
    [3, 4],
    [4, 4, 'Finish'],
  ] as const
  for (const [r, c, name] of path) await cell(page, r, c, name as string | undefined).click()
  await expect(page.getByText('Maze solved!', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
})

test('[A5] New Maze with the same seed regenerates the identical maze and resets the score', async ({ page }) => {
  await open(page)
  await generate(page, '42')
  await expect(page.getByRole('button', { name: 'New Maze', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'New Maze', exact: true }).click()
  await expect(cell(page, 1, 1)).toBeVisible()
  expect(await isWall(page, 1, 1), 'regenerated seed-42 maze has cell (1,1) open').toBe(false)
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A6] the History tab records the best score', async ({ page }) => {
  await open(page)
  await generate(page, '42')
  const path = [
    [0, 0, 'Start'],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 2],
    [2, 3],
    [3, 3],
    [3, 4],
    [4, 4, 'Finish'],
  ] as const
  for (const [r, c, name] of path) await cell(page, r, c, name as string | undefined).click()
  await expect(page.getByText('Maze solved!', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Best Score', exact: true })).toBeVisible()
  await expect(page.getByText('1', { exact: true })).toBeVisible()
  await expect(page.getByText('1 maze solved', { exact: true })).toBeVisible()
})

test('[A7] Copy Solution shows a toast and copies the path to the clipboard', async ({ page, context }) => {
  await open(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await generate(page, '42')
  const path = [
    [0, 0, 'Start'],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 2],
    [2, 3],
    [3, 3],
    [3, 4],
    [4, 4, 'Finish'],
  ] as const
  for (const [r, c, name] of path) await cell(page, r, c, name as string | undefined).click()
  await expect(page.getByText('Maze solved!', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Copy Solution', exact: true }).click()
  await expect(page.getByText('Solution copied to clipboard', { exact: true })).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the solved path').toBe(
    '0,0 -> 0,1 -> 1,1 -> 1,2 -> 2,2 -> 2,3 -> 3,3 -> 3,4 -> 4,4',
  )
})

test('[A8] a different seed generates a different maze', async ({ page }) => {
  await open(page)
  await generate(page, '99')
  await expect(cell(page, 1, 1)).toBeVisible()
  expect(await isWall(page, 1, 1), 'cell (1,1) of the seed-99 maze is a wall').toBe(true)
})

test('[A9] a reload resets the score display but keeps the best score in History', async ({ page }) => {
  await open(page)
  await generate(page, '42')
  const path = [
    [0, 0, 'Start'],
    [0, 1],
    [1, 1],
    [1, 2],
    [2, 2],
    [2, 3],
    [3, 3],
    [3, 4],
    [4, 4, 'Finish'],
  ] as const
  for (const [r, c, name] of path) await cell(page, r, c, name as string | undefined).click()
  await expect(page.getByText('Maze solved!', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 1', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History', exact: true }).click()
  await expect(page.getByRole('columnheader', { name: 'Best Score', exact: true })).toBeVisible()
  await expect(page.getByText('1', { exact: true })).toBeVisible()
})
