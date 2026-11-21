# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] a matching result grows the streak to 2
- Location: tests/acceptance.spec.ts:40:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1  | import { expect, test } from '@playwright/test'
  2  | 
  3  | const card = (page) => page.getByText(/^(Heads|Tails)$/).first()
  4  | const streak = (page) => page.getByText(/^Streak: /)
  5  | const best = (page) => page.getByText(/^Best: /)
  6  | const flip = (page) => page.getByRole('button', { name: 'Flip' })
  7  | const result = (page) => card(page).innerText()
  8  | 
  9  | // Reads the result without changing state, so each flip is observed independently.
  10 | async function flipTo(page, side: 'Heads' | 'Tails') {
  11 |   for (let i = 0; i < 256; i++) {
  12 |     await flip(page).click()
  13 |     if ((await result(page)) === side) return
  14 |   }
  15 |   throw new Error(`never landed on ${side}`)
  16 | }
  17 | 
  18 | test('[A1] initial load shows the heading, Flip, Tails card and Streak: 0', async ({ page }) => {
  19 |   await page.goto('/')
  20 |   await expect(page.getByRole('heading', { name: 'Coin Flip' })).toBeVisible()
  21 |   await expect(flip(page)).toBeVisible()
  22 |   await expect(card(page)).toHaveText('Tails')
  23 |   await expect(streak(page)).toHaveText('Streak: 0')
  24 | })
  25 | 
  26 | test('[A2] one flip shows Heads or Tails and Streak: 1', async ({ page }) => {
  27 |   await page.goto('/')
  28 |   await flip(page).click()
  29 |   await result(page)
  30 |   await expect(streak(page)).toHaveText('Streak: 1')
  31 | })
  32 | 
  33 | test('[A3] a differing result restarts the streak at 1', async ({ page }) => {
  34 |   await page.goto('/')
  35 |   await flipTo(page, 'Heads')
  36 |   await flipTo(page, 'Tails')
  37 |   await expect(streak(page)).toHaveText('Streak: 1')
  38 | })
  39 | 
  40 | test('[A3] a matching result grows the streak to 2', async ({ page }) => {
> 41 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  42 |   await flipTo(page, 'Heads')
  43 |   await flipTo(page, 'Heads')
  44 |   await expect(streak(page)).toHaveText('Streak: 2')
  45 | })
  46 | 
  47 | test('[A4] a streak of 3 shows Best: 3', async ({ page }) => {
  48 |   await page.goto('/')
  49 |   for (const _ of [0, 1, 2]) await flipTo(page, 'Tails')
  50 |   await expect(streak(page)).toHaveText('Streak: 3')
  51 |   await expect(best(page)).toHaveText('Best: 3')
  52 | })
  53 | 
  54 | test('[A5] Reset returns the card, streak and best to their initial values', async ({ page }) => {
  55 |   await page.goto('/')
  56 |   for (const _ of [0, 1, 2]) await flipTo(page, 'Heads')
  57 |   await expect(best(page)).toHaveText('Best: 3')
  58 |   await page.getByRole('button', { name: 'Reset' }).click()
  59 |   await expect(streak(page)).toHaveText('Streak: 0')
  60 |   await expect(best(page)).toHaveText('Best: 0')
  61 |   await expect(card(page)).toHaveText('Tails')
  62 | })
  63 | 
  64 | test('[A6] Grading a Heads card shows Correct below the card', async ({ page }) => {
  65 |   await page.goto('/')
  66 |   await flipTo(page, 'Heads')
  67 |   await card(page).getByRole('button', { name: 'Grade' }).click()
  68 |   await expect(page.getByText('Correct')).toBeVisible()
  69 | })
  70 | 
  71 | test('[A7] Grading a Tails card shows Incorrect below the card', async ({ page }) => {
  72 |   await page.goto('/')
  73 |   await flipTo(page, 'Tails')
  74 |   await card(page).getByRole('button', { name: 'Grade' }).click()
  75 |   await expect(page.getByText('Incorrect')).toBeVisible()
  76 | })
  77 | 
  78 | test('[A8] the latest result and streak survive a reload', async ({ page }) => {
  79 |   await page.goto('/')
  80 |   await flipTo(page, 'Heads')
  81 |   await expect(streak(page)).toHaveText('Streak: 1')
  82 |   await page.reload()
  83 |   await expect(card(page)).toHaveText('Heads')
  84 |   await expect(streak(page)).toHaveText('Streak: 1')
  85 | })
  86 | 
```