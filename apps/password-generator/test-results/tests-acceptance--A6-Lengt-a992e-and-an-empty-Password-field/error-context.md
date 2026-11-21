# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A6] Length outside 4 to 64 shows the message and an empty Password field
- Location: tests/acceptance.spec.ts:64:1

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
  3   | async function generate(page: Page) {
  4   |   await page.getByRole('button', { name: 'Generate' }).click()
  5   | }
  6   | 
  7   | async function setChecked(page: Page, label: string, checked: boolean) {
  8   |   const box = page.getByLabel(label)
  9   |   if ((await box.isChecked()) !== checked) await box.click()
  10  | }
  11  | 
  12  | test('[A1] page shows heading, Length 16 and four checked character sets', async ({ page }) => {
  13  |   await page.goto('/')
  14  |   await expect(page.getByRole('heading', { name: 'Password Generator' })).toBeVisible()
  15  |   await expect(page.getByLabel('Length')).toHaveValue('16')
  16  |   await expect(page.getByLabel('Lowercase')).toBeChecked()
  17  |   await expect(page.getByLabel('Uppercase')).toBeChecked()
  18  |   await expect(page.getByLabel('Digits')).toBeChecked()
  19  |   await expect(page.getByLabel('Symbols')).toBeChecked()
  20  | })
  21  | 
  22  | test('[A2] Generate puts a 16-character password in the Password field', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await generate(page)
  25  |   const field = page.getByLabel('Password')
  26  |   await expect(field).toBeReadOnly()
  27  |   await expect(field).toHaveValue(/.{16}/)
  28  |   expect((await field.inputValue()).length).toBe(16)
  29  | })
  30  | 
  31  | test('[A3] only Digits checked gives an 8-digit password', async ({ page }) => {
  32  |   await page.goto('/')
  33  |   await setChecked(page, 'Lowercase', false)
  34  |   await setChecked(page, 'Uppercase', false)
  35  |   await setChecked(page, 'Symbols', false)
  36  |   await page.getByLabel('Length').fill('8')
  37  |   await generate(page)
  38  |   await expect(page.getByLabel('Password')).toHaveValue(/^[0-9]{8}$/)
  39  | })
  40  | 
  41  | test('[A4] only letters checked gives 40 characters with at least one of each case', async ({ page }) => {
  42  |   await page.goto('/')
  43  |   await setChecked(page, 'Digits', false)
  44  |   await setChecked(page, 'Symbols', false)
  45  |   await page.getByLabel('Length').fill('40')
  46  |   await generate(page)
  47  |   const value = await page.getByLabel('Password').inputValue()
  48  |   expect(value).toMatch(/^[A-Za-z]{40}$/)
  49  |   expect(value).toMatch(/[a-z]/)
  50  |   expect(value).toMatch(/[A-Z]/)
  51  | })
  52  | 
  53  | test('[A5] no character set checked shows the message and an empty Password field', async ({ page }) => {
  54  |   await page.goto('/')
  55  |   await setChecked(page, 'Lowercase', false)
  56  |   await setChecked(page, 'Uppercase', false)
  57  |   await setChecked(page, 'Digits', false)
  58  |   await setChecked(page, 'Symbols', false)
  59  |   await generate(page)
  60  |   await expect(page.getByText('Choose at least one character set')).toBeVisible()
  61  |   await expect(page.getByLabel('Password')).toHaveValue('')
  62  | })
  63  | 
  64  | test('[A6] Length outside 4 to 64 shows the message and an empty Password field', async ({ page }) => {
> 65  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  66  |   await page.getByLabel('Length').fill('3')
  67  |   await generate(page)
  68  |   await expect(page.getByText('Length must be between 4 and 64')).toBeVisible()
  69  |   await expect(page.getByLabel('Password')).toHaveValue('')
  70  |   await page.getByLabel('Length').fill('65')
  71  |   await generate(page)
  72  |   await expect(page.getByText('Length must be between 4 and 64')).toBeVisible()
  73  |   await expect(page.getByLabel('Password')).toHaveValue('')
  74  | })
  75  | 
  76  | test('[A7] two Generates with Length 32 give different passwords', async ({ page }) => {
  77  |   await page.goto('/')
  78  |   await page.getByLabel('Length').fill('32')
  79  |   await generate(page)
  80  |   const first = await page.getByLabel('Password').inputValue()
  81  |   await generate(page)
  82  |   const second = await page.getByLabel('Password').inputValue()
  83  |   expect(first).not.toBe(second)
  84  | })
  85  | 
  86  | test('[A8] digits only at Length 4 is Weak, all sets at Length 20 is Strong', async ({ page }) => {
  87  |   await page.goto('/')
  88  |   await setChecked(page, 'Lowercase', false)
  89  |   await setChecked(page, 'Uppercase', false)
  90  |   await setChecked(page, 'Symbols', false)
  91  |   await page.getByLabel('Length').fill('4')
  92  |   await generate(page)
  93  |   await expect(page.getByText('Strength: Weak')).toBeVisible()
  94  |   await setChecked(page, 'Lowercase', true)
  95  |   await setChecked(page, 'Uppercase', true)
  96  |   await setChecked(page, 'Symbols', true)
  97  |   await page.getByLabel('Length').fill('20')
  98  |   await generate(page)
  99  |   await expect(page.getByText('Strength: Strong')).toBeVisible()
  100 | })
  101 | 
  102 | test('[A9] Length 24 with Symbols unchecked survives a reload', async ({ page }) => {
  103 |   await page.goto('/')
  104 |   await page.getByLabel('Length').fill('24')
  105 |   await setChecked(page, 'Symbols', false)
  106 |   await page.reload()
  107 |   await expect(page.getByLabel('Length')).toHaveValue('24')
  108 |   await expect(page.getByLabel('Symbols')).not.toBeChecked()
  109 |   await expect(page.getByLabel('Lowercase')).toBeChecked()
  110 |   await expect(page.getByLabel('Uppercase')).toBeChecked()
  111 |   await expect(page.getByLabel('Digits')).toBeChecked()
  112 | })
  113 | 
```