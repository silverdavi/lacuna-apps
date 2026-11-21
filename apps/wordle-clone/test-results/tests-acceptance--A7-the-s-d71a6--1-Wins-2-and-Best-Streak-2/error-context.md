# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A7] the second word is APPLE; guessing it shows Solved in 1, Wins: 2 and Best Streak: 2
- Location: tests/acceptance.spec.ts:86:1

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
  3   | const wins = (page: Page, n: number) => page.getByText(`Wins: ${n}`, { exact: true })
  4   | 
  5   | const streak = (page: Page, n: number) => page.getByText(`Best Streak: ${n}`, { exact: true })
  6   | 
  7   | const status = (page: Page, text: string) => page.getByText(text, { exact: true })
  8   | 
  9   | // Tiles are the board cells of row `row` in DOM order, 0-indexed.
  10  | const tile = (page: Page, row: number, col: number) => page.locator('[data-row]').nth(row).locator('[data-letter]').nth(col)
  11  | 
  12  | // Asserts that the col-th tile of row carries a "correct" (green) marker.
  13  | async function expectTileCorrect(page: Page, row: number, col: number) {
  14  |   const t = tile(page, row, col)
  15  |   await expect(t).toBeVisible()
  16  |   const marker = await t.evaluate((el) => [el.getAttribute('data-state') ?? '', el.className, el.getAttribute('aria-label') ?? ''].join(' '))
  17  |   expect(marker, `tile row ${row} col ${col} marked correct`).toMatch(/correct|green|match/i)
  18  | }
  19  | 
  20  | const newGame = (page: Page) => page.getByRole('button', { name: 'New Game' })
  21  | 
  22  | async function open(page: Page) {
> 23  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  24  | }
  25  | 
  26  | async function typeWord(page: Page, word: string) {
  27  |   for (const l of word) await page.keyboard.press(l)
  28  |   await page.keyboard.press('Enter')
  29  | }
  30  | 
  31  | async function winWithCrane(page: Page) {
  32  |   await open(page)
  33  |   await typeWord(page, 'CRANE')
  34  | }
  35  | 
  36  | test('[A1] the page shows the heading and the tagline', async ({ page }) => {
  37  |   await open(page)
  38  |   await expect(page.getByRole('heading', { name: 'Wordle Game' })).toBeVisible()
  39  |   await expect(page.getByText('Guess the word in 6 tries')).toBeVisible()
  40  | })
  41  | 
  42  | test('[A2] a fresh game shows the New Game button and clicking it shows Ready', async ({ page }) => {
  43  |   await open(page)
  44  |   await expect(newGame(page)).toBeVisible()
  45  |   await newGame(page).click()
  46  |   await expect(status(page, 'Ready')).toBeVisible()
  47  | })
  48  | 
  49  | test('[A3] typing CRANE and pressing Enter submits it: row 1 shows the letters and status is Try 1', async ({ page }) => {
  50  |   await open(page)
  51  |   await typeWord(page, 'CRANE')
  52  |   const word = 'CRANE'
  53  |   for (let i = 0; i < word.length; i++) {
  54  |     await expect(tile(page, 0, i)).toHaveText(word[i])
  55  |   }
  56  |   await expect(status(page, 'Try 1')).toBeVisible()
  57  | })
  58  | 
  59  | test('[A4] guessing CRANE marks all five tiles of row 1 correct and shows Solved in 1', async ({ page }) => {
  60  |   await open(page)
  61  |   await typeWord(page, 'CRANE')
  62  |   await expect(status(page, 'Solved in 1')).toBeVisible()
  63  |   for (let i = 0; i < 5; i++) {
  64  |     await expectTileCorrect(page, 0, i)
  65  |   }
  66  | })
  67  | 
  68  | // A5 says the button is disabled after a win yet also that clicking it resets;
  69  | // testing the reading that agrees with A2, A7 and A9: it resets to Ready.
  70  | test('[A5] after a win, New Game resets the board to empty rows and shows Ready', async ({ page }) => {
  71  |   await winWithCrane(page)
  72  |   await expect(status(page, 'Solved in 1')).toBeVisible()
  73  |   await newGame(page).click()
  74  |   await expect(status(page, 'Ready')).toBeVisible()
  75  |   for (let i = 0; i < 5; i++) {
  76  |     await expect(tile(page, 0, i)).not.toHaveText('C')
  77  |   }
  78  | })
  79  | 
  80  | test('[A6] winning shows Wins: 1 and Best Streak: 1', async ({ page }) => {
  81  |   await winWithCrane(page)
  82  |   await expect(wins(page, 1)).toBeVisible()
  83  |   await expect(streak(page, 1)).toBeVisible()
  84  | })
  85  | 
  86  | test('[A7] the second word is APPLE; guessing it shows Solved in 1, Wins: 2 and Best Streak: 2', async ({ page }) => {
  87  |   await winWithCrane(page)
  88  |   await newGame(page).click()
  89  |   await expect(status(page, 'Ready')).toBeVisible()
  90  |   await typeWord(page, 'APPLE')
  91  |   await expect(status(page, 'Solved in 1')).toBeVisible()
  92  |   await expect(wins(page, 2)).toBeVisible()
  93  |   await expect(streak(page, 2)).toBeVisible()
  94  |   for (let i = 0; i < 5; i++) {
  95  |     await expectTileCorrect(page, 0, i)
  96  |   }
  97  | })
  98  | 
  99  | test('[A8] a too-short word shows Invalid word and does not update the board', async ({ page }) => {
  100 |   await open(page)
  101 |   await page.keyboard.press('Q')
  102 |   await page.keyboard.press('X')
  103 |   await page.keyboard.press('Z')
  104 |   await page.keyboard.press('Enter')
  105 |   await expect(status(page, 'Invalid word')).toBeVisible()
  106 |   for (let i = 0; i < 5; i++) {
  107 |     await expect(tile(page, 0, i)).not.toHaveText(/Q|X|Z/)
  108 |   }
  109 | })
  110 | 
  111 | test('[A8] a too-long word shows Invalid word and does not update the board', async ({ page }) => {
  112 |   await open(page)
  113 |   for (const l of 'ABCDEFG') await page.keyboard.press(l)
  114 |   await page.keyboard.press('Enter')
  115 |   await expect(status(page, 'Invalid word')).toBeVisible()
  116 |   for (let i = 0; i < 5; i++) {
  117 |     await expect(tile(page, 0, i)).not.toHaveText(/A|B|C|D|E|F|G/)
  118 |   }
  119 | })
  120 | 
  121 | test('[A9] after a win and a new game, reload keeps Wins: 1, Best Streak: 1 and an empty board with Ready', async ({ page }) => {
  122 |   await winWithCrane(page)
  123 |   await expect(wins(page, 1)).toBeVisible()
```