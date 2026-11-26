# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A6] chart reflects angle mode for sin(x)
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
  3  | test('[A1] heading and input panel text', async ({ page }) => {
  4  |   await page.goto('/')
  5  |   await expect(page.getByRole('heading', { name: 'Scientific Calculator' })).toBeVisible()
  6  |   await expect(page.getByText('Enter an expression')).toBeVisible()
  7  | })
  8  | 
  9  | test('[A2] evaluates 2 + 3 * 4 to 14', async ({ page }) => {
  10 |   await page.goto('/')
  11 |   await page.getByLabel('Expression').fill('2 + 3 * 4')
  12 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  13 |   await expect(page.getByLabel('Result')).toHaveValue('14')
  14 | })
  15 | 
  16 | test('[A3] evaluates sin(30) to 0.5', async ({ page }) => {
  17 |   await page.goto('/')
  18 |   await page.getByLabel('Expression').fill('sin(30)')
  19 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  20 |   await expect(page.getByLabel('Result')).toHaveValue('0.5')
  21 | })
  22 | 
  23 | test('[A4] evaluates log(1000) to 3', async ({ page }) => {
  24 |   await page.goto('/')
  25 |   await page.getByLabel('Expression').fill('log(1000)')
  26 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  27 |   await expect(page.getByLabel('Result')).toHaveValue('3')
  28 | })
  29 | 
  30 | test('[A5] evaluates 2 ^ 10 to 1024', async ({ page }) => {
  31 |   await page.goto('/')
  32 |   await page.getByLabel('Expression').fill('2 ^ 10')
  33 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  34 |   await expect(page.getByLabel('Result')).toHaveValue('1024')
  35 | })
  36 | 
  37 | // The spec names "the chart tab" and gives the y-value at x=30 for each angle
  38 | // mode: 0.5 in Degrees, -0.988 in Radians. The chart DOM is unspecified, so
  39 | // we confirm the chart surfaces the plotted value in each mode.
  40 | test('[A6] chart reflects angle mode for sin(x)', async ({ page }) => {
> 41 |   await page.goto('/')
     |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  42 | 
  43 |   await page.getByLabel('Expression').fill('sin(x)')
  44 |   await page.getByRole('select', { name: 'Angle mode' }).selectOption('Degrees')
  45 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  46 |   const chartTab = page.getByRole('tab', { name: /chart/i })
  47 |   await chartTab.click()
  48 |   const degChart = page.locator('svg, canvas').first()
  49 |   await expect(degChart).toBeVisible()
  50 |   await expect(page.getByText('0.5')).toBeVisible()
  51 | 
  52 |   await page.getByRole('select', { name: 'Angle mode' }).selectOption('Radians')
  53 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  54 |   await chartTab.click()
  55 |   const radChart = page.locator('svg, canvas').first()
  56 |   await expect(radChart).toBeVisible()
  57 |   await expect(page.getByText('-0.988')).toBeVisible()
  58 | })
  59 | 
  60 | test('[A7] copy result copies 5 to the clipboard', async ({ page, context }) => {
  61 |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  62 |   await page.goto('/')
  63 |   await page.getByLabel('Expression').fill('2 + 3')
  64 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  65 |   await expect(page.getByLabel('Result')).toHaveValue('5')
  66 |   await page.getByRole('button', { name: 'Copy result' }).click()
  67 |   const clip = await page.evaluate(() => navigator.clipboard.readText())
  68 |   expect(clip).toBe('5')
  69 | })
  70 | 
  71 | test('[A8] history shows evaluated item and clear removes it', async ({ page }) => {
  72 |   await page.goto('/')
  73 |   await page.getByLabel('Expression').fill('2 + 3')
  74 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  75 |   await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  76 |   await page.getByRole('button', { name: 'Clear history' }).click()
  77 |   await expect(page.getByText('No history')).toBeVisible()
  78 | })
  79 | 
  80 | test('[A9] reload keeps expression and history', async ({ page }) => {
  81 |   await page.goto('/')
  82 |   await page.getByLabel('Expression').fill('2 + 3')
  83 |   await page.getByRole('button', { name: 'Evaluate' }).click()
  84 |   await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  85 |   await page.reload()
  86 |   await expect(page.getByLabel('Expression')).toHaveValue('2 + 3')
  87 |   await expect(page.getByText('2 + 3 = 5')).toBeVisible()
  88 | })
  89 | 
```