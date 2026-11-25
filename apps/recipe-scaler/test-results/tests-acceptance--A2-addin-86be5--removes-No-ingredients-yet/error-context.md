# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A2] adding Flour 1 1/2 cups adds a table row and removes No ingredients yet
- Location: tests/acceptance.spec.ts:14:1

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
  3   | const scale = (page: Page): Locator => page.getByText(/^Scale factor: /)
  4   | const flourRow = (page: Page): Locator => page.getByRole('row', { name: /Flour/ })
  5   | const saltRow = (page: Page): Locator => page.getByRole('row', { name: /Salt/ })
  6   | 
  7   | test('[A1] with no ingredients the page shows the heading, No ingredients yet, and Scale factor: 1.00', async ({ page }) => {
  8   |   await page.goto('/')
  9   |   await expect(page.getByRole('heading', { name: 'Recipe Scaler', exact: true })).toBeVisible()
  10  |   await expect(page.getByText('No ingredients yet', { exact: true })).toBeVisible()
  11  |   await expect(scale(page)).toHaveText('Scale factor: 1.00')
  12  | })
  13  | 
  14  | test('[A2] adding Flour 1 1/2 cups adds a table row and removes No ingredients yet', async ({ page }) => {
> 15  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  16  |   await page.getByLabel('Quantity', { exact: true }).fill('1 1/2')
  17  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'cups' })
  18  |   await page.getByLabel('Ingredient', { exact: true }).fill('Flour')
  19  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  20  |   const row = flourRow(page)
  21  |   await expect(row).toContainText('Flour')
  22  |   await expect(row).toContainText('1 1/2')
  23  |   await expect(row).toContainText('cups')
  24  |   await expect(page.getByText('No ingredients yet', { exact: true })).toBeHidden()
  25  | })
  26  | 
  27  | test('[A3] scaling Flour 1 1/2 cups from 2 to 4 servings shows Scale factor: 2.00 and 3 cups', async ({ page }) => {
  28  |   await page.goto('/')
  29  |   await page.getByLabel('Quantity', { exact: true }).fill('1 1/2')
  30  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'cups' })
  31  |   await page.getByLabel('Ingredient', { exact: true }).fill('Flour')
  32  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  33  |   await page.getByLabel('Original servings', { exact: true }).fill('2')
  34  |   await page.getByLabel('Target servings', { exact: true }).fill('4')
  35  |   await expect(scale(page)).toHaveText('Scale factor: 2.00')
  36  |   await expect(flourRow(page)).toContainText('3 cups')
  37  | })
  38  | 
  39  | test('[A4] scaling Salt 1/4 tsp from 2 to 6 servings shows 3/4 tsp and Scale factor: 3.00', async ({ page }) => {
  40  |   await page.goto('/')
  41  |   await page.getByLabel('Quantity', { exact: true }).fill('1 1/2')
  42  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'cups' })
  43  |   await page.getByLabel('Ingredient', { exact: true }).fill('Flour')
  44  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  45  |   await page.getByLabel('Quantity', { exact: true }).fill('1/4')
  46  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'tsp' })
  47  |   await page.getByLabel('Ingredient', { exact: true }).fill('Salt')
  48  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  49  |   await page.getByLabel('Original servings', { exact: true }).fill('2')
  50  |   await page.getByLabel('Target servings', { exact: true }).fill('6')
  51  |   await expect(saltRow(page)).toContainText('3/4 tsp')
  52  |   await expect(scale(page)).toHaveText('Scale factor: 3.00')
  53  | })
  54  | 
  55  | test('[A5] deleting the Flour row leaves Salt at 3/4 tsp with Scale factor: 3.00', async ({ page }) => {
  56  |   await page.goto('/')
  57  |   await page.getByLabel('Quantity', { exact: true }).fill('1 1/2')
  58  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'cups' })
  59  |   await page.getByLabel('Ingredient', { exact: true }).fill('Flour')
  60  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  61  |   await page.getByLabel('Quantity', { exact: true }).fill('1/4')
  62  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'tsp' })
  63  |   await page.getByLabel('Ingredient', { exact: true }).fill('Salt')
  64  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  65  |   await page.getByLabel('Original servings', { exact: true }).fill('2')
  66  |   await page.getByLabel('Target servings', { exact: true }).fill('6')
  67  |   await page.getByRole('button', { name: 'Delete Flour', exact: true }).click()
  68  |   await expect(flourRow(page)).toBeHidden()
  69  |   await expect(saltRow(page)).toContainText('3/4 tsp')
  70  |   await expect(scale(page)).toHaveText('Scale factor: 3.00')
  71  | })
  72  | 
  73  | test('[A6] scaling Salt 1/4 tsp from 4 to 2 servings shows 1/8 tsp and Scale factor: 0.50', async ({ page }) => {
  74  |   await page.goto('/')
  75  |   await page.getByLabel('Quantity', { exact: true }).fill('1/4')
  76  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'tsp' })
  77  |   await page.getByLabel('Ingredient', { exact: true }).fill('Salt')
  78  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  79  |   await page.getByLabel('Original servings', { exact: true }).fill('4')
  80  |   await page.getByLabel('Target servings', { exact: true }).fill('2')
  81  |   await expect(saltRow(page)).toContainText('1/8 tsp')
  82  |   await expect(scale(page)).toHaveText('Scale factor: 0.50')
  83  | })
  84  | 
  85  | test('[A7] a target of 0 servings shows an error and keeps Scale factor: 1.00', async ({ page }) => {
  86  |   await page.goto('/')
  87  |   await page.getByLabel('Quantity', { exact: true }).fill('1 1/2')
  88  |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'cups' })
  89  |   await page.getByLabel('Ingredient', { exact: true }).fill('Flour')
  90  |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  91  |   await page.getByLabel('Original servings', { exact: true }).fill('2')
  92  |   await page.getByLabel('Target servings', { exact: true }).fill('0')
  93  |   await page.getByLabel('Target servings', { exact: true }).press('Tab')
  94  |   await expect(page.getByText('Target servings must be greater than 0', { exact: true })).toBeVisible()
  95  |   await expect(scale(page)).toHaveText('Scale factor: 1.00')
  96  | })
  97  | 
  98  | test('[A8] reloading after scaling Flour and Salt from 2 to 8 servings keeps 6 cups, 1 tsp, and Scale factor: 4.00', async ({ page }) => {
  99  |   await page.goto('/')
  100 |   await page.getByLabel('Quantity', { exact: true }).fill('1 1/2')
  101 |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'cups' })
  102 |   await page.getByLabel('Ingredient', { exact: true }).fill('Flour')
  103 |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  104 |   await page.getByLabel('Quantity', { exact: true }).fill('1/4')
  105 |   await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'tsp' })
  106 |   await page.getByLabel('Ingredient', { exact: true }).fill('Salt')
  107 |   await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
  108 |   await page.getByLabel('Original servings', { exact: true }).fill('2')
  109 |   await page.getByLabel('Target servings', { exact: true }).fill('8')
  110 |   await page.reload()
  111 |   await expect(flourRow(page)).toContainText('6 cups')
  112 |   await expect(saltRow(page)).toContainText('1 tsp')
  113 |   await expect(scale(page)).toHaveText('Scale factor: 4.00')
  114 | })
  115 | 
```