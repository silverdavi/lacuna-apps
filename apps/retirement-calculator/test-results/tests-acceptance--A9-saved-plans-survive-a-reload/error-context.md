# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A9] saved plans survive a reload
- Location: tests/acceptance.spec.ts:117:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  18  |   await page.getByRole('button', { name: 'Calculate' }).click()
  19  |   await expect(
  20  |     page.getByText('Projected savings at retirement: $1,482,532.00').first(),
  21  |   ).toBeVisible()
  22  | })
  23  | 
  24  | test('[A3] breakdown table shows year 1 balance', async ({ page }) => {
  25  |   await page.goto('/')
  26  |   await page.getByLabel('Current age').fill('30')
  27  |   await page.getByLabel('Retirement age').fill('65')
  28  |   await page.getByLabel('Current savings').fill('50000')
  29  |   await page.getByLabel('Monthly contribution').fill('500')
  30  |   await page.getByLabel('Annual return %').fill('7')
  31  |   await page.getByRole('button', { name: 'Calculate' }).click()
  32  |   const row = page.getByRole('table').getByRole('row').filter({ hasText: 'Year 1' })
  33  |   await expect(row).toContainText('$56,000.00')
  34  | })
  35  | 
  36  | test('[A4] chart shows 35 data points for years 1 through 35', async ({ page }) => {
  37  |   await page.goto('/')
  38  |   await page.getByLabel('Current age').fill('30')
  39  |   await page.getByLabel('Retirement age').fill('65')
  40  |   await page.getByLabel('Current savings').fill('50000')
  41  |   await page.getByLabel('Monthly contribution').fill('500')
  42  |   await page.getByLabel('Annual return %').fill('7')
  43  |   await page.getByRole('button', { name: 'Calculate' }).click()
  44  |   await page.getByRole('tab', { name: 'Chart' }).click()
  45  |   const points = await page.locator('[data-point]').count()
  46  |   expect(points, 'chart data points').toBe(35)
  47  | })
  48  | 
  49  | test('[A5] Chart and Table tabs switch views', async ({ page }) => {
  50  |   await page.goto('/')
  51  |   await page.getByLabel('Current age').fill('30')
  52  |   await page.getByLabel('Retirement age').fill('65')
  53  |   await page.getByLabel('Current savings').fill('50000')
  54  |   await page.getByLabel('Monthly contribution').fill('500')
  55  |   await page.getByLabel('Annual return %').fill('7')
  56  |   await page.getByRole('button', { name: 'Calculate' }).click()
  57  |   await page.getByRole('tab', { name: 'Chart' }).click()
  58  |   await expect(page.locator('[data-point]')).toBeVisible()
  59  |   await page.getByRole('tab', { name: 'Table' }).click()
  60  |   const table = page.getByRole('table')
  61  |   await expect(table).toBeVisible()
  62  |   const header = table.getByRole('row').first()
  63  |   await expect(header).toContainText('Year')
  64  |   await expect(header).toContainText('Contribution')
  65  |   await expect(header).toContainText('Growth')
  66  |   await expect(header).toContainText('Balance')
  67  | })
  68  | 
  69  | test('[A6] recalculating at 10% return updates the result', async ({ page }) => {
  70  |   await page.goto('/')
  71  |   await page.getByLabel('Current age').fill('30')
  72  |   await page.getByLabel('Retirement age').fill('65')
  73  |   await page.getByLabel('Current savings').fill('50000')
  74  |   await page.getByLabel('Monthly contribution').fill('500')
  75  |   await page.getByLabel('Annual return %').fill('7')
  76  |   await page.getByRole('button', { name: 'Calculate' }).click()
  77  |   await page.getByLabel('Annual return %').fill('10')
  78  |   await page.getByRole('button', { name: 'Calculate' }).click()
  79  |   await expect(
  80  |     page.getByText('Projected savings at retirement: $2,138,941.00').first(),
  81  |   ).toBeVisible()
  82  | })
  83  | 
  84  | test('[A7] copies the result to the clipboard', async ({ page, context }) => {
  85  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  86  |   await page.goto('/')
  87  |   await page.getByLabel('Current age').fill('30')
  88  |   await page.getByLabel('Retirement age').fill('65')
  89  |   await page.getByLabel('Current savings').fill('50000')
  90  |   await page.getByLabel('Monthly contribution').fill('500')
  91  |   await page.getByLabel('Annual return %').fill('7')
  92  |   await page.getByRole('button', { name: 'Calculate' }).click()
  93  |   await page.getByRole('button', { name: 'Copy result' }).click()
  94  |   await expect(page.getByText('Copied to clipboard').first()).toBeVisible()
  95  |   const clip = await page.evaluate(() => navigator.clipboard.readText())
  96  |   expect(clip).toBe('Projected savings at retirement: $1,482,532.00')
  97  | })
  98  | 
  99  | test('[A8] saves plans with their details', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await page.getByLabel('Current age').fill('30')
  102 |   await page.getByLabel('Retirement age').fill('65')
  103 |   await page.getByLabel('Current savings').fill('50000')
  104 |   await page.getByLabel('Monthly contribution').fill('500')
  105 |   await page.getByLabel('Annual return %').fill('7')
  106 |   await page.getByRole('button', { name: 'Calculate' }).click()
  107 |   await page.getByRole('button', { name: 'Save plan' }).click()
  108 |   await page.getByRole('button', { name: 'Save plan' }).click()
  109 |   const plan1 = page.getByRole('listitem').filter({ hasText: 'Plan 1' })
  110 |   const plan2 = page.getByRole('listitem').filter({ hasText: 'Plan 2' })
  111 |   await expect(plan1).toContainText('Age 30 to 65')
  112 |   await expect(plan1).toContainText('Return 7%')
  113 |   await expect(plan2).toContainText('Age 30 to 65')
  114 |   await expect(plan2).toContainText('Return 7%')
  115 | })
  116 | 
  117 | test('[A9] saved plans survive a reload', async ({ page }) => {
> 118 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  119 |   await page.getByLabel('Current age').fill('30')
  120 |   await page.getByLabel('Retirement age').fill('65')
  121 |   await page.getByLabel('Current savings').fill('50000')
  122 |   await page.getByLabel('Monthly contribution').fill('500')
  123 |   await page.getByLabel('Annual return %').fill('7')
  124 |   await page.getByRole('button', { name: 'Calculate' }).click()
  125 |   await page.getByRole('button', { name: 'Save plan' }).click()
  126 |   await page.getByRole('button', { name: 'Save plan' }).click()
  127 |   await page.reload()
  128 |   const plan1 = page.getByRole('listitem').filter({ hasText: 'Plan 1' })
  129 |   const plan2 = page.getByRole('listitem').filter({ hasText: 'Plan 2' })
  130 |   await expect(plan1).toContainText('Age 30 to 65')
  131 |   await expect(plan1).toContainText('Return 7%')
  132 |   await expect(plan2).toContainText('Age 30 to 65')
  133 |   await expect(plan2).toContainText('Return 7%')
  134 | })
  135 | 
```