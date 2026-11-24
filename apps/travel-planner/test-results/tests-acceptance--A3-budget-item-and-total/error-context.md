# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A3] budget item and total
- Location: tests/acceptance.spec.ts:26:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test'
  2   | 
  3   | // A2 asserts the event title is visible on the Calendar tab after save;
  4   | // the spec's "on the 15th of June" placement is not machine-checkable without
  5   | // coupling to a particular calendar layout, so the title visibility is asserted.
  6   | 
  7   | test('[A1] page shows the heading and three tabs', async ({ page }) => {
  8   |   await page.goto('/')
  9   |   await expect(page.getByRole('heading', { name: 'Travel Planner' })).toBeVisible()
  10  |   await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible()
  11  |   await expect(page.getByRole('tab', { name: 'Budget' })).toBeVisible()
  12  |   await expect(page.getByRole('tab', { name: 'Packing' })).toBeVisible()
  13  | })
  14  | 
  15  | test('[A2] new calendar event shows on the correct day', async ({ page }) => {
  16  |   await page.goto('/')
  17  |   await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible()
  18  |   await page.getByRole('button', { name: 'New event' }).click()
  19  |   await page.getByLabel('Title').fill('Flight to Paris')
  20  |   await page.getByLabel('Date').fill('2025-06-15')
  21  |   await page.getByLabel('Start time').fill('08:30')
  22  |   await page.getByRole('button', { name: 'Save' }).click()
  23  |   await expect(page.getByText('Flight to Paris')).toBeVisible()
  24  | })
  25  | 
  26  | test('[A3] budget item and total', async ({ page }) => {
> 27  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  28  |   await page.getByRole('tab', { name: 'Budget' }).click()
  29  |   await page.getByLabel('Item').fill('Hotel')
  30  |   await page.getByLabel('Amount').fill('450.75')
  31  |   await page.getByRole('button', { name: 'Add item' }).click()
  32  |   await expect(page.getByText('Hotel')).toBeVisible()
  33  |   await expect(page.getByText('$450.75')).toBeVisible()
  34  |   await expect(page.getByText('Total: $450.75')).toBeVisible()
  35  | })
  36  | 
  37  | test('[A4] second budget item updates total', async ({ page }) => {
  38  |   await page.goto('/')
  39  |   await page.getByRole('tab', { name: 'Budget' }).click()
  40  |   await page.getByLabel('Item').fill('Hotel')
  41  |   await page.getByLabel('Amount').fill('450.75')
  42  |   await page.getByRole('button', { name: 'Add item' }).click()
  43  |   await page.getByLabel('Item').fill('Flights')
  44  |   await page.getByLabel('Amount').fill('800.25')
  45  |   await page.getByRole('button', { name: 'Add item' }).click()
  46  |   await expect(page.getByText('Flights')).toBeVisible()
  47  |   await expect(page.getByText('$800.25')).toBeVisible()
  48  |   await expect(page.getByText('Total: $1,251.00')).toBeVisible()
  49  | })
  50  | 
  51  | test('[A5] packing item and progress', async ({ page }) => {
  52  |   await page.goto('/')
  53  |   await page.getByRole('tab', { name: 'Packing' }).click()
  54  |   await page.getByLabel('New item').fill('Passport')
  55  |   await page.getByLabel('New item').press('Enter')
  56  |   await expect(page.getByText('Passport')).toBeVisible()
  57  |   await expect(page.getByText('0 of 1 packed')).toBeVisible()
  58  | })
  59  | 
  60  | test('[A6] checking a packing item updates progress', async ({ page }) => {
  61  |   await page.goto('/')
  62  |   await page.getByRole('tab', { name: 'Packing' }).click()
  63  |   await page.getByLabel('New item').fill('Passport')
  64  |   await page.getByLabel('New item').press('Enter')
  65  |   await page.getByLabel('New item').fill('Charger')
  66  |   await page.getByLabel('New item').press('Enter')
  67  |   await page.locator('label', { hasText: 'Passport' }).getByRole('checkbox').check()
  68  |   await expect(page.getByText('1 of 2 packed')).toBeVisible()
  69  | })
  70  | 
  71  | test('[A7] delete budget item updates total', async ({ page }) => {
  72  |   await page.goto('/')
  73  |   await page.getByRole('tab', { name: 'Budget' }).click()
  74  |   await page.getByLabel('Item').fill('Hotel')
  75  |   await page.getByLabel('Amount').fill('450.75')
  76  |   await page.getByRole('button', { name: 'Add item' }).click()
  77  |   await page.getByLabel('Item').fill('Flights')
  78  |   await page.getByLabel('Amount').fill('800.25')
  79  |   await page.getByRole('button', { name: 'Add item' }).click()
  80  |   await page.getByRole('button', { name: 'Delete Hotel' }).click()
  81  |   await expect(page.getByText('$450.75')).toHaveCount(0)
  82  |   await expect(page.getByText('Total: $800.25')).toBeVisible()
  83  | })
  84  | 
  85  | test('[A8] export ICS copies an ICS string to the clipboard', async ({ page, context }) => {
  86  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  87  |   await page.goto('/')
  88  |   await page.getByRole('button', { name: 'New event' }).click()
  89  |   await page.getByLabel('Title').fill('Flight to Paris')
  90  |   await page.getByLabel('Date').fill('2025-06-15')
  91  |   await page.getByLabel('Start time').fill('08:30')
  92  |   await page.getByRole('button', { name: 'Save' }).click()
  93  |   await page.getByRole('button', { name: 'Export ICS' }).click()
  94  |   const clip = await page.evaluate(() => navigator.clipboard.readText())
  95  |   expect(clip).toContain('BEGIN:VEVENT')
  96  |   expect(clip).toContain('Flight to Paris')
  97  | })
  98  | 
  99  | test('[A9] reload keeps event, budget item, and checked packing item', async ({ page }) => {
  100 |   await page.goto('/')
  101 |   await page.getByRole('button', { name: 'New event' }).click()
  102 |   await page.getByLabel('Title').fill('Flight to Paris')
  103 |   await page.getByLabel('Date').fill('2025-06-15')
  104 |   await page.getByLabel('Start time').fill('08:30')
  105 |   await page.getByRole('button', { name: 'Save' }).click()
  106 |   await page.getByRole('tab', { name: 'Budget' }).click()
  107 |   await page.getByLabel('Item').fill('Flights')
  108 |   await page.getByLabel('Amount').fill('800.25')
  109 |   await page.getByRole('button', { name: 'Add item' }).click()
  110 |   await page.getByRole('tab', { name: 'Packing' }).click()
  111 |   await page.getByLabel('New item').fill('Passport')
  112 |   await page.getByLabel('New item').press('Enter')
  113 |   await page.locator('label', { hasText: 'Passport' }).getByRole('checkbox').check()
  114 |   await page.reload()
  115 |   await expect(page.getByRole('tab', { name: 'Calendar' })).toBeVisible()
  116 |   await expect(page.getByText('Flight to Paris')).toBeVisible()
  117 |   await page.getByRole('tab', { name: 'Budget' }).click()
  118 |   await expect(page.getByText('Flights')).toBeVisible()
  119 |   await expect(page.getByText('$800.25')).toBeVisible()
  120 |   await page.getByRole('tab', { name: 'Packing' }).click()
  121 |   await expect(page.locator('label', { hasText: 'Passport' }).getByRole('checkbox')).toBeChecked()
  122 | })
  123 | 
```