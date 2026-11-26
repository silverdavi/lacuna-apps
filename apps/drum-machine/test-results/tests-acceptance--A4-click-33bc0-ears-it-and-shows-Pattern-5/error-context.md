# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A4] clicking Step 1 again clears it and shows Pattern: 5
- Location: tests/acceptance.spec.ts:34:1

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
  3  | // Fresh browser profile per test, so every test starts from an empty app.
  4  | test.use({ storageState: { cookies: [], origins: [] } })
  5  | 
  6  | async function focusGrid(page: Page) {
  7  |   await page.getByRole('cell', { name: 'Step 1' }).click()
  8  |   await page.getByRole('cell', { name: 'Step 1' }).click()
  9  | }
  10 | 
  11 | test('[A1] initial load shows heading, 16-cell grid, Tempo: 120, and Play', async ({ page }) => {
  12 |   await page.goto('/')
  13 |   await expect(page.getByRole('heading', { name: 'Drum Machine' })).toBeVisible()
  14 |   await expect(page.getByRole('cell')).toHaveCount(16)
  15 |   await expect(page.getByText('Tempo: 120')).toBeVisible()
  16 |   await expect(page.getByRole('button', { name: 'Play' })).toBeVisible()
  17 | })
  18 | 
  19 | test('[A2] clicking Step 1 fills it and shows Pattern: 1', async ({ page }) => {
  20 |   await page.goto('/')
  21 |   await page.getByRole('cell', { name: 'Step 1' }).click()
  22 |   await expect(page.getByText('Pattern: 1')).toBeVisible()
  23 |   await expect(page.getByRole('cell', { name: 'Step 1' })).toHaveAttribute('aria-pressed', 'true')
  24 | })
  25 | 
  26 | test('[A3] clicking Step 5 fills it and shows Pattern: 1, 5', async ({ page }) => {
  27 |   await page.goto('/')
  28 |   await page.getByRole('cell', { name: 'Step 1' }).click()
  29 |   await page.getByRole('cell', { name: 'Step 5' }).click()
  30 |   await expect(page.getByText('Pattern: 1, 5')).toBeVisible()
  31 |   await expect(page.getByRole('cell', { name: 'Step 5' })).toHaveAttribute('aria-pressed', 'true')
  32 | })
  33 | 
  34 | test('[A4] clicking Step 1 again clears it and shows Pattern: 5', async ({ page }) => {
> 35 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  36 |   await page.getByRole('cell', { name: 'Step 1' }).click()
  37 |   await page.getByRole('cell', { name: 'Step 5' }).click()
  38 |   await page.getByRole('cell', { name: 'Step 1' }).click()
  39 |   await expect(page.getByText('Pattern: 5')).toBeVisible()
  40 |   await expect(page.getByRole('cell', { name: 'Step 1' })).toHaveAttribute('aria-pressed', 'false')
  41 | })
  42 | 
  43 | test('[A5] typing 140 in Tempo and pressing Enter shows Tempo: 140', async ({ page }) => {
  44 |   await page.goto('/')
  45 |   await page.getByLabel('Tempo').fill('140')
  46 |   await page.getByLabel('Tempo').press('Enter')
  47 |   await expect(page.getByText('Tempo: 140')).toBeVisible()
  48 | })
  49 | 
  50 | // Spec's "after 2 seconds" is a minimum; the audio loop is untestable, so the
  51 | // assertion is that Stop is actionable and returns the button to Play.
  52 | test('[A6] Play starts the loop as Stop, Stop returns it to Play', async ({ page }) => {
  53 |   await page.goto('/')
  54 |   await page.getByRole('cell', { name: 'Step 1' }).click()
  55 |   await page.getByRole('cell', { name: 'Step 5' }).click()
  56 |   await page.getByRole('button', { name: 'Play' }).click()
  57 |   await expect(page.getByRole('button', { name: 'Stop' })).toBeEnabled()
  58 |   await page.getByRole('button', { name: 'Stop' }).click()
  59 |   await expect(page.getByRole('button', { name: 'Play' })).toBeEnabled()
  60 | })
  61 | 
  62 | test('[A7] pressing key 1 with grid focus activates Step 1 and shows Pattern: 1', async ({ page }) => {
  63 |   await page.goto('/')
  64 |   await focusGrid(page)
  65 |   await page.keyboard.press('1')
  66 |   await expect(page.getByText('Pattern: 1')).toBeVisible()
  67 | })
  68 | 
  69 | test('[A8] pressing key 5 with grid focus activates Step 5 and shows Pattern: 1, 5', async ({ page }) => {
  70 |   await page.goto('/')
  71 |   await focusGrid(page)
  72 |   await page.keyboard.press('1')
  73 |   await page.keyboard.press('5')
  74 |   await expect(page.getByText('Pattern: 1, 5')).toBeVisible()
  75 | })
  76 | 
  77 | test('[A9] reload keeps the pattern and tempo', async ({ page }) => {
  78 |   await page.goto('/')
  79 |   await page.getByRole('cell', { name: 'Step 1' }).click()
  80 |   await page.getByRole('cell', { name: 'Step 5' }).click()
  81 |   await page.getByLabel('Tempo').fill('140')
  82 |   await page.getByLabel('Tempo').press('Enter')
  83 |   await page.reload()
  84 |   await expect(page.getByText('Tempo: 140')).toBeVisible()
  85 |   await expect(page.getByText('Pattern: 1, 5')).toBeVisible()
  86 | })
  87 | 
```