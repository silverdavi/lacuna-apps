# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A9] a reload keeps the entered value and the other empty cell stays empty
- Location: tests/acceptance.spec.ts:106:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test'
  2   | 
  3   | async function open(page: Page) {
  4   |   await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
> 5   |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  6   |   await page.clock.pauseAt(new Date('2026-01-01T09:01:00'))
  7   | }
  8   | 
  9   | const grid = (page: Page) => page.getByRole('grid', { name: 'Board', exact: true })
  10  | const cell = (page: Page, row: number, col: number) =>
  11  |   page.getByRole('gridcell', { name: `Row ${row}, Column ${col}`, exact: true })
  12  | const timer = (page: Page) => page.getByRole('timer', { name: 'Time', exact: true })
  13  | 
  14  | async function newGame(page: Page, difficulty: 'Practice' | 'Easy' | 'Hard') {
  15  |   await page.getByLabel('Difficulty', { exact: true }).selectOption(difficulty)
  16  |   await page.getByRole('button', { name: 'New Game', exact: true }).click()
  17  | }
  18  | 
  19  | async function digit(page: Page, n: number) {
  20  |   await page.getByRole('button', { name: String(n), exact: true }).click()
  21  | }
  22  | 
  23  | async function place(page: Page, row: number, col: number, n: number) {
  24  |   await cell(page, row, col).click()
  25  |   await digit(page, n)
  26  | }
  27  | 
  28  | test('[A1] on load the heading, the Difficulty select with Easy, New Game, and the timer 00:00 are shown', async ({ page }) => {
  29  |   await page.clock.install({ time: new Date('2026-01-01T09:00:00') })
  30  |   await page.goto('/')
  31  |   await expect(page.getByRole('heading', { name: 'Sudoku Puzzle', exact: true })).toBeVisible()
  32  |   await expect(page.getByLabel('Difficulty', { exact: true })).toBeVisible()
  33  |   await expect(page.getByLabel('Difficulty', { exact: true })).toHaveValue('Easy')
  34  |   await expect(page.getByRole('button', { name: 'New Game', exact: true })).toBeVisible()
  35  |   const t = timer(page)
  36  |   await expect(t).toBeVisible()
  37  |   await expect(t).toHaveText('00:00')
  38  | })
  39  | 
  40  | test('[A2] a Practice game shows 1 in Row 1 Column 1, an empty Row 1 Column 2, and timer 00:00', async ({ page }) => {
  41  |   await open(page)
  42  |   await newGame(page, 'Practice')
  43  |   await expect(cell(page, 1, 1)).toHaveText('1')
  44  |   await expect(cell(page, 1, 2)).toHaveText('')
  45  |   await expect(timer(page)).toHaveText('00:00')
  46  | })
  47  | 
  48  | test('[A3] a given cell cannot be changed', async ({ page }) => {
  49  |   await open(page)
  50  |   await newGame(page, 'Practice')
  51  |   await cell(page, 1, 1).click()
  52  |   await digit(page, 5)
  53  |   await expect(cell(page, 1, 1)).toHaveText('1')
  54  | })
  55  | 
  56  | test('[A4] the correct digit goes into the selected empty cell', async ({ page }) => {
  57  |   await open(page)
  58  |   await newGame(page, 'Practice')
  59  |   await place(page, 1, 2, 2)
  60  |   await expect(cell(page, 1, 2)).toHaveText('2')
  61  | })
  62  | 
  63  | test('[A5] the running timer counts up', async ({ page }) => {
  64  |   await open(page)
  65  |   await newGame(page, 'Practice')
  66  |   await page.clock.fastForward(1000)
  67  |   await expect(timer(page)).toHaveText('00:01')
  68  |   await page.clock.fastForward(2000)
  69  |   await expect(timer(page)).toHaveText('00:03')
  70  | })
  71  | 
  72  | test('[A6] a Hard game leaves at least 30 empty cells', async ({ page }) => {
  73  |   await open(page)
  74  |   await newGame(page, 'Hard')
  75  |   let empty = 0
  76  |   for (let r = 1; r <= 9; r++) {
  77  |     for (let c = 1; c <= 9; c++) {
  78  |       const text = await cell(page, r, c).textContent()
  79  |       if ((text ?? '').trim() === '') empty++
  80  |     }
  81  |   }
  82  |   expect(empty).toBeGreaterThanOrEqual(30)
  83  | })
  84  | 
  85  | test('[A7] solving the Practice board shows Puzzle Solved and stops the timer', async ({ page }) => {
  86  |   await open(page)
  87  |   await newGame(page, 'Practice')
  88  |   await place(page, 1, 2, 2)
  89  |   await place(page, 2, 5, 8)
  90  |   await place(page, 5, 5, 9)
  91  |   await place(page, 9, 9, 8)
  92  |   await expect(page.getByText('Puzzle Solved', { exact: true })).toBeVisible()
  93  |   const frozen = await timer(page).textContent()
  94  |   await page.clock.fastForward(5000)
  95  |   expect(await timer(page).textContent()).toBe(frozen)
  96  | })
  97  | 
  98  | test('[A8] a repeated digit in the row marks the cell invalid and shows Invalid move', async ({ page }) => {
  99  |   await open(page)
  100 |   await newGame(page, 'Practice')
  101 |   await place(page, 1, 2, 1)
  102 |   await expect(cell(page, 1, 2)).toHaveAttribute('aria-invalid', 'true')
  103 |   await expect(page.getByText('Invalid move', { exact: true })).toBeVisible()
  104 | })
  105 | 
```