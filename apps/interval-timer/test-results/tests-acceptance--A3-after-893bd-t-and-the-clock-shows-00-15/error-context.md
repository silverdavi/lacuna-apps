# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] after the work phase completes the phase is Rest and the clock shows 00:15
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
  3  | function clock(page: Page) {
  4  |   return page.getByText(/^\d{2}:\d{2}$/).first()
  5  | }
  6  | 
  7  | function phase(page: Page) {
  8  |   return page.getByText(/^(Ready|Work|Rest)$/).first()
  9  | }
  10 | 
  11 | function roundCounter(page: Page) {
  12 |   return page.getByText(/Round \d+/).first()
  13 | }
  14 | 
  15 | async function startTimer(page: Page, work: string, rest: string) {
> 16 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  17 |   await page.getByLabel('Work (sec)').fill(work)
  18 |   await page.getByLabel('Rest (sec)').fill(rest)
  19 |   await page.getByRole('button', { name: 'Start' }).click()
  20 | }
  21 | 
  22 | test('[A1] page heading reads "Interval Timer" and the Timer tab is visible and active', async ({ page }) => {
  23 |   await page.goto('/')
  24 |   await expect(page.getByRole('heading', { name: 'Interval Timer' })).toBeVisible()
  25 |   await expect(page.getByRole('tab', { name: 'Timer' })).toBeVisible()
  26 | })
  27 | 
  28 | test('[A2] typing 30 work and 15 rest then Start shows 00:30 and Work phase', async ({ page }) => {
  29 |   await startTimer(page, '30', '15')
  30 |   await expect(clock(page)).toHaveText('00:30')
  31 |   await expect(phase(page)).toHaveText('Work')
  32 | })
  33 | 
  34 | test('[A3] after the work phase completes the phase is Rest and the clock shows 00:15', async ({ page }) => {
  35 |   await startTimer(page, '30', '15')
  36 |   await expect(phase(page)).toHaveText('Rest')
  37 |   await expect(clock(page)).toHaveText('00:15')
  38 | })
  39 | 
  40 | test('[A4] after the rest phase completes the phase is Work and the round counter shows Round 2', async ({ page }) => {
  41 |   await startTimer(page, '30', '15')
  42 |   await expect(phase(page)).toHaveText('Work')
  43 |   await expect(roundCounter(page)).toHaveText('Round 2')
  44 | })
  45 | 
  46 | test('[A5] clicking Pause stops the countdown and the button label changes to Resume', async ({ page }) => {
  47 |   await startTimer(page, '30', '15')
  48 |   await page.getByRole('button', { name: 'Pause' }).click()
  49 |   await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  50 | })
  51 | 
  52 | test('[A6] clicking Resume restarts the countdown from the paused time', async ({ page }) => {
  53 |   await startTimer(page, '30', '15')
  54 |   await page.getByRole('button', { name: 'Pause' }).click()
  55 |   await page.getByRole('button', { name: 'Resume' }).click()
  56 |   await expect(phase(page)).toHaveText('Work')
  57 |   await expect(clock(page)).not.toHaveText('00:00')
  58 | })
  59 | 
  60 | test('[A7] clicking Stop resets the timer to 00:00, phase to Ready, and round to Round 1', async ({ page }) => {
  61 |   await startTimer(page, '30', '15')
  62 |   await page.getByRole('button', { name: 'Stop' }).click()
  63 |   await expect(clock(page)).toHaveText('00:00')
  64 |   await expect(phase(page)).toHaveText('Ready')
  65 |   await expect(roundCounter(page)).toHaveText('Round 1')
  66 | })
  67 | 
  68 | test('[A8] after completing one full cycle the History tab shows a list item with Round 1, Work: 30s and Rest: 15s', async ({ page }) => {
  69 |   await startTimer(page, '30', '15')
  70 |   await expect(roundCounter(page)).toHaveText('Round 2')
  71 |   await page.getByRole('tab', { name: 'History' }).click()
  72 |   const entry = page.getByRole('listitem').filter({ hasText: 'Round 1' })
  73 |   await expect(entry).toBeVisible()
  74 |   await expect(entry).toContainText('Work: 30s')
  75 |   await expect(entry).toContainText('Rest: 15s')
  76 | })
  77 | 
  78 | test('[A9] reload keeps the timer state: after starting a 30-second work phase and reloading, the clock shows remaining time and Work phase', async ({ page }) => {
  79 |   await startTimer(page, '30', '15')
  80 |   await expect(phase(page)).toHaveText('Work')
  81 |   await page.reload()
  82 |   await expect(phase(page)).toHaveText('Work')
  83 |   await expect(clock(page)).not.toHaveText('00:00')
  84 | })
  85 | 
```