# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A1] on load the heading, Moves: 0, and exactly 13 lit cells are shown
- Location: tests/acceptance.spec.ts:31:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test'
  2  | 
  3  | // Cells are addressed (row, column), both counted from 1, row 1 at the top.
  4  | // Cells are found by the accessible name "Row R, Column C" (the spec's cell
  5  | // naming). They are click targets, so they match on the button role; a bare
  6  | // gridcell would not be clickable.
  7  | const cell = (page: Page, r: number, c: number) =>
  8  |   page.getByRole('button', { name: `Row ${r}, Column ${c}` })
  9  | 
  10 | // Count the lit cells on the 5x5 board. Reading a rendered value after the
  11 | // user's actions is allowed.
  12 | async function litCount(page: Page): Promise<number> {
  13 |   let n = 0
  14 |   for (let r = 1; r <= 5; r++) {
  15 |     for (let c = 1; c <= 5; c++) {
  16 |       const el = await cell(page, r, c).elementHandle()
  17 |       if (el && await el.evaluate((node) => Boolean(node.getAttribute('aria-pressed')) === true)) n++
  18 |     }
  19 |   }
  20 |   return n
  21 | }
  22 | 
  23 | async function solve(page: Page) {
  24 |   for (let r = 1; r <= 5; r++) for (let c = 1; c <= 5; c++) await cell(page, r, c).click()
  25 | }
  26 | 
  27 | test.beforeEach(async ({ page }) => {
> 28 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  29 | })
  30 | 
  31 | test('[A1] on load the heading, Moves: 0, and exactly 13 lit cells are shown', async ({ page }) => {
  32 |   await expect(page.getByRole('heading', { name: 'Lights Out' })).toBeVisible()
  33 |   await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  34 |   expect(await litCount(page)).toBe(13)
  35 | })
  36 | 
  37 | test('[A2] clicking Row 1 Column 1 toggles it and its right and bottom neighbors, to 10 lit cells and Moves: 1', async ({ page }) => {
  38 |   await cell(page, 1, 1).click()
  39 |   expect(await litCount(page)).toBe(10)
  40 |   await expect(page.getByText('Moves: 1', { exact: true })).toBeVisible()
  41 | })
  42 | 
  43 | test('[A3] clicking Row 1 Column 2 toggles it, its left and right neighbors, and its bottom neighbor, to Moves: 2', async ({ page }) => {
  44 |   await cell(page, 1, 1).click()
  45 |   await cell(page, 1, 2).click()
  46 |   await expect(page.getByText('Moves: 2', { exact: true })).toBeVisible()
  47 | })
  48 | 
  49 | test('[A4] clicking all 25 cells in row-major order solves the board and shows Solved! with Moves: 25', async ({ page }) => {
  50 |   await solve(page)
  51 |   expect(await litCount(page)).toBe(0)
  52 |   await expect(page.getByText('Solved!', { exact: true })).toBeVisible()
  53 |   await expect(page.getByText('Moves: 25', { exact: true })).toBeVisible()
  54 | })
  55 | 
  56 | test('[A5] New Game after solving resets the board to 13 lit cells, Moves: 0, and removes Solved!', async ({ page }) => {
  57 |   await solve(page)
  58 |   await page.getByRole('button', { name: 'New Game', exact: true }).click()
  59 |   expect(await litCount(page)).toBe(13)
  60 |   await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  61 |   await expect(page.getByText('Solved!', { exact: true })).toHaveCount(0)
  62 | })
  63 | 
  64 | test('[A6] Best: 25 appears after solving and is unchanged by a second 25-move solve', async ({ page }) => {
  65 |   await solve(page)
  66 |   await expect(page.getByText('Best: 25', { exact: true })).toBeVisible()
  67 |   await page.getByRole('button', { name: 'New Game', exact: true }).click()
  68 |   await solve(page)
  69 |   await expect(page.getByText('Best: 25', { exact: true })).toBeVisible()
  70 | })
  71 | 
  72 | test('[A7] reloading after a 25-move solve shows Best: 25 and the seed 42 board with Moves: 0', async ({ page }) => {
  73 |   await solve(page)
  74 |   await page.reload()
  75 |   await expect(page.getByText('Best: 25', { exact: true })).toBeVisible()
  76 |   expect(await litCount(page)).toBe(13)
  77 |   await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  78 | })
  79 | 
  80 | test('[A8] changing Seed from 42 to 7 and clicking New Game gives a 11-lit-cell board with Moves: 0', async ({ page }) => {
  81 |   await page.getByLabel('Seed', { exact: true }).fill('7')
  82 |   await page.getByRole('button', { name: 'New Game', exact: true }).click()
  83 |   expect(await litCount(page)).toBe(11)
  84 |   await expect(page.getByText('Moves: 0', { exact: true })).toBeVisible()
  85 | })
  86 | 
```