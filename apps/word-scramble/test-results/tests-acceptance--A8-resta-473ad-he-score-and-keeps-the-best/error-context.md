# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A8] restarting ends the round, resets the score and keeps the best
- Location: tests/acceptance.spec.ts:80:1

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
  3  | const toast = (page: Page, text: string) =>
  4  |   page
  5  |     .getByText(text)
  6  |     .or(page.getByRole('status').getByText(text))
  7  |     .or(page.getByRole('alert').getByText(text))
  8  | 
  9  | async function startRound(page: Page) {
> 10 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  11 |   await page.getByLabel('Seed').fill('42')
  12 |   await page.getByLabel('Difficulty').selectOption('Easy')
  13 |   await page.getByRole('button', { name: 'Start round' }).click()
  14 | }
  15 | 
  16 | test('[A1] on load the heading, No active round and Score: 0 are shown', async ({ page }) => {
  17 |   await page.goto('/')
  18 |   await expect(page.getByRole('heading', { name: 'Word Scramble Game' })).toBeVisible()
  19 |   await expect(page.getByText('No active round')).toBeVisible()
  20 |   await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  21 | })
  22 | 
  23 | test('[A2] starting a round shows Round started, the timer and the scrambled word', async ({ page }) => {
  24 |   await startRound(page)
  25 |   await expect(page.getByText('Round started')).toBeVisible()
  26 |   await expect(page.getByText('00:30', { exact: true })).toBeVisible()
  27 |   await expect(page.getByText('ELP', { exact: true })).toBeVisible()
  28 | })
  29 | 
  30 | test('[A3] a correct answer shows the toast, adds 10 points and shows the next word', async ({ page }) => {
  31 |   await startRound(page)
  32 |   await page.getByLabel('Answer').fill('HELP')
  33 |   await page.getByRole('button', { name: 'Submit' }).click()
  34 |   await expect(toast(page, 'Correct! +10 points').first()).toBeVisible()
  35 |   await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  36 |   await expect(page.getByText('WORLD', { exact: true })).toBeVisible()
  37 | })
  38 | 
  39 | test('[A4] an incorrect answer shows the toast, keeps Score: 0 and keeps the word', async ({ page }) => {
  40 |   await startRound(page)
  41 |   await page.getByLabel('Answer').fill('HELQ')
  42 |   await page.getByRole('button', { name: 'Submit' }).click()
  43 |   await expect(toast(page, 'Incorrect').first()).toBeVisible()
  44 |   await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  45 |   await expect(page.getByText('ELP', { exact: true })).toBeVisible()
  46 | })
  47 | 
  48 | test('[A5] pausing renames the button to Resume and stops the timer', async ({ page }) => {
  49 |   await startRound(page)
  50 |   await page.getByRole('button', { name: 'Pause' }).click()
  51 |   await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  52 |   await page.getByLabel('Answer').fill('HELQ')
  53 |   await page.getByRole('button', { name: 'Submit' }).click()
  54 |   const first = (await page.getByText(/^00:\d\d$/, { exact: true }).first().innerText()).trim()
  55 |   await page.getByLabel('Answer').fill('HELQ')
  56 |   await page.getByRole('button', { name: 'Submit' }).click()
  57 |   const second = (await page.getByText(/^00:\d\d$/, { exact: true }).first().innerText()).trim()
  58 |   expect(second, 'timer does not run while paused').toBe(first)
  59 | })
  60 | 
  61 | test('[A6] giving up ends the round, shows the final score and updates the best', async ({ page }) => {
  62 |   await startRound(page)
  63 |   await page.getByRole('button', { name: 'Give up' }).click()
  64 |   await expect(toast(page, 'Round over').first()).toBeVisible()
  65 |   await expect(page.getByText('Final score: 0')).toBeVisible()
  66 |   await expect(page.getByText('Best: 0', { exact: true })).toBeVisible()
  67 | })
  68 | 
  69 | test('[A7] after solving a word, a reload keeps the round, the next word and the score', async ({ page }) => {
  70 |   await startRound(page)
  71 |   await page.getByLabel('Answer').fill('HELP')
  72 |   await page.getByRole('button', { name: 'Submit' }).click()
  73 |   await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  74 |   await page.reload()
  75 |   await expect(page.getByText('Round started')).toBeVisible()
  76 |   await expect(page.getByText('WORLD', { exact: true })).toBeVisible()
  77 |   await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  78 | })
  79 | 
  80 | test('[A8] restarting ends the round, resets the score and keeps the best', async ({ page }) => {
  81 |   await startRound(page)
  82 |   await page.getByLabel('Answer').fill('HELP')
  83 |   await page.getByRole('button', { name: 'Submit' }).click()
  84 |   await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  85 |   await page.getByRole('button', { name: 'Restart' }).click()
  86 |   await expect(page.getByText('No active round')).toBeVisible()
  87 |   await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  88 |   await expect(page.getByText('Best: 10', { exact: true })).toBeVisible()
  89 | })
  90 | 
```