# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] typing "pan" in the search box highlights "Pancakes" and filters the table
- Location: tests/acceptance.spec.ts:38:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test, type Locator, type Page } from '@playwright/test'
  2   | 
  3   | import { readFileSync } from 'node:fs'
  4   | 
  5   | async function addRecipe(page: Page, name: string, servings: string) {
  6   |   await page.getByRole('button', { name: 'Add recipe' }).click()
  7   |   await page.getByLabel('Name').fill(name)
  8   |   await page.getByLabel('Servings').fill(servings)
  9   |   await page.getByRole('button', { name: 'Save' }).click()
  10  | }
  11  | 
  12  | // [A3] the spec does not say how a match is marked; the app is built to satisfy
  13  | // this test, so accept a visible highlight state via aria/class/text.
  14  | const isHighlighted = (el: Locator) =>
  15  |   el.evaluate((node) => {
  16  |     const s = getComputedStyle(node as HTMLElement)
  17  |     const cls = node.className.toLowerCase()
  18  |     return (
  19  |       cls.includes('highlight') ||
  20  |       node.getAttribute('aria-current') === 'true' ||
  21  |       s.fontWeight === 'bold' ||
  22  |       s.backgroundColor !== 'rgba(0, 0, 0, 0)'
  23  |     )
  24  |   })
  25  | 
  26  | test('[A1] the page heading is "Recipe Manager"', async ({ page }) => {
  27  |   await page.goto('/')
  28  |   await expect(page.getByRole('heading', { name: 'Recipe Manager' })).toBeVisible()
  29  | })
  30  | 
  31  | test('[A2] adding a recipe adds a row with its name and servings', async ({ page }) => {
  32  |   await page.goto('/')
  33  |   await addRecipe(page, 'Pancakes', '4')
  34  |   await expect(page.getByText('Pancakes')).toBeVisible()
  35  |   await expect(page.getByText('4')).toBeVisible()
  36  | })
  37  | 
  38  | test('[A3] typing "pan" in the search box highlights "Pancakes" and filters the table', async ({
  39  |   page,
  40  | }) => {
> 41  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  42  |   await addRecipe(page, 'Pancakes', '4')
  43  |   await addRecipe(page, 'Bolognese', '4')
  44  |   await page.getByRole('textbox').fill('pan')
  45  |   await expect(page.getByText('Pancakes')).toBeVisible()
  46  |   await expect(page.getByText('Bolognese')).toHaveCount(0)
  47  |   await expect.poll(() => isHighlighted(page.getByText('Pancakes'))).toBe(true)
  48  | })
  49  | 
  50  | test('[A4] clicking the "Name" column header sorts rows alphabetically by name', async ({
  51  |   page,
  52  | }) => {
  53  |   await page.goto('/')
  54  |   await addRecipe(page, 'Zucchini', '4')
  55  |   await addRecipe(page, 'Apple pie', '4')
  56  |   await page.getByRole('columnheader', { name: 'Name' }).click()
  57  |   const names = await page.evaluate(() =>
  58  |     [...document.querySelectorAll('tr')]
  59  |       .map((r) => r.textContent ?? '')
  60  |       .filter((t) => t.includes('Zucchini') || t.includes('Apple pie')),
  61  |   )
  62  |   expect(names.indexOf('Apple pie') < names.indexOf('Zucchini'), 'rows sorted by name').toBe(true)
  63  | })
  64  | 
  65  | test('[A5] editing a recipe updates its servings', async ({ page }) => {
  66  |   await page.goto('/')
  67  |   await addRecipe(page, 'Pancakes', '4')
  68  |   await page.getByRole('button', { name: 'Edit Pancakes' }).click()
  69  |   await expect(page.getByLabel('Name')).toHaveValue('Pancakes')
  70  |   await page.getByLabel('Servings').fill('6')
  71  |   await page.getByRole('button', { name: 'Save' }).click()
  72  |   await expect(page.getByText('6')).toBeVisible()
  73  | })
  74  | 
  75  | test('[A6] deleting a recipe removes its row', async ({ page }) => {
  76  |   await page.goto('/')
  77  |   await addRecipe(page, 'Pancakes', '4')
  78  |   await addRecipe(page, 'Bolognese', '4')
  79  |   await expect(page.getByText('Pancakes')).toBeVisible()
  80  |   await page.getByRole('button', { name: 'Delete Pancakes' }).click()
  81  |   await expect(page.getByText('Pancakes')).toHaveCount(0)
  82  | })
  83  | 
  84  | test('[A7] exporting CSV downloads a file with the header and the row', async ({ page }) => {
  85  |   await page.goto('/')
  86  |   await addRecipe(page, 'Pancakes', '4')
  87  |   const [download] = await Promise.all([
  88  |     page.waitForEvent('download'),
  89  |     page.getByRole('button', { name: 'Export CSV' }).click(),
  90  |   ])
  91  |   const content = readFileSync(await download.path(), 'utf8')
  92  |   expect(content, 'file contains the header line').toContain('Name,Servings')
  93  |   expect(content, 'file contains the data row').toContain('Pancakes,4')
  94  | })
  95  | 
  96  | test('[A8] with no recipes the table shows the empty-state text', async ({ page }) => {
  97  |   await page.goto('/')
  98  |   await expect(page.getByText('No recipes yet')).toBeVisible()
  99  | })
  100 | 
  101 | test('[A9] reload keeps the recipe and its servings', async ({ page }) => {
  102 |   await page.goto('/')
  103 |   await addRecipe(page, 'Pancakes', '4')
  104 |   await page.reload()
  105 |   await expect(page.getByText('Pancakes')).toBeVisible()
  106 |   await expect(page.getByText('4')).toBeVisible()
  107 | })
  108 | 
```