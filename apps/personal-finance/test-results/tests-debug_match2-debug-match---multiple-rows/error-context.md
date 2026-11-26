# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/debug_match2.spec.ts >> debug match - multiple rows
- Location: tests/debug_match2.spec.ts:3:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('row').filter({ hasText: 'Salary' })
Timeout: 5000ms
- Expected  - 3
+ Received  + 3

  Array [
-   "+$2,500.00",
-   "Bank",
-   "Salary",
+   "SalaryIncome",
+   "BankSalary",
+   "+$2,500.00Salary",
  ]

Call log:
  - Expect "toContainText" getByRole('row').filter({ hasText: 'Salary' }) with timeout 5000ms
  - waiting for getByRole('row').filter({ hasText: 'Salary' })
    14 × locator resolved to 3 elements

```

# Page snapshot

```yaml
- table [ref=e2]:
  - rowgroup [ref=e3]:
    - row [ref=e4]:
      - cell "Salary" [ref=e5]
      - cell "Income" [ref=e6]
    - row [ref=e7]:
      - cell "Bank" [ref=e8]
      - cell "Salary" [ref=e9]
    - row [ref=e10]:
      - cell "+$2,500.00" [ref=e11]
      - cell "Salary" [ref=e12]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test('debug match - multiple rows', async ({ page }) => {
  4  |   await page.setContent(`
  5  |     <html><body>
  6  |       <table style="display:block">
  7  |         <tbody>
  8  |           <tr><td>Salary</td><td>Income</td></tr>
  9  |           <tr><td>Bank</td><td>Salary</td></tr>
  10 |           <tr><td>+$2,500.00</td><td>Salary</td></tr>
  11 |         </tbody>
  12 |       </table>
  13 |     </body></html>
  14 |   `)
  15 | 
  16 |   const rows = page.getByRole('row').filter({ hasText: 'Salary' })
  17 |   console.log('Count:', await rows.count())
  18 |   for (let i = 0; i < await rows.count(); i++) {
  19 |     console.log(`Row ${i}:`, JSON.stringify(await rows.nth(i).innerText()))
  20 |   }
  21 | 
> 22 |   await expect(rows).toContainText(['+$2,500.00', 'Bank', 'Salary'])
     |                      ^ Error: expect(locator).toContainText(expected) failed
  23 |   console.log('PASS')
  24 | })
  25 | 
  26 | test('debug match - single row with display block', async ({ page }) => {
  27 |   await page.setContent(`
  28 |     <html><body>
  29 |       <table style="display:block">
  30 |         <tbody>
  31 |           <tr style="display:block">
  32 |             <td style="display:block">Salary</td>
  33 |             <td style="display:block">Income</td>
  34 |             <td style="display:block">Bank</td>
  35 |             <td style="display:block">Salary</td>
  36 |             <td style="display:block">+$2,500.00</td>
  37 |             <td style="display:block">Salary</td>
  38 |           </tr>
  39 |         </tbody>
  40 |       </table>
  41 |     </body></html>
  42 |   `)
  43 | 
  44 |   const row = page.getByRole('row').filter({ hasText: 'Salary' })
  45 |   console.log('Count:', await row.count())
  46 |   for (let i = 0; i < await row.count(); i++) {
  47 |     console.log(`Row ${i}:`, JSON.stringify(await row.nth(i).innerText()))
  48 |   }
  49 | 
  50 |   await expect(row).toContainText(['+$2,500.00', 'Bank', 'Salary'])
  51 |   console.log('PASS')
  52 | })
  53 | 
  54 | test('debug match - divs instead of table', async ({ page }) => {
  55 |   await page.setContent(`
  56 |     <html><body>
  57 |       <div role="row">
  58 |         <div role="cell">Salary</div>
  59 |         <div role="cell">Income</div>
  60 |         <div role="cell">Bank</div>
  61 |         <div role="cell">Salary</div>
  62 |         <div role="cell">+$2,500.00</div>
  63 |         <div role="cell">Salary</div>
  64 |       </div>
  65 |     </body></html>
  66 |   `)
  67 | 
  68 |   const row = page.getByRole('row').filter({ hasText: 'Salary' })
  69 |   console.log('Count:', await row.count())
  70 |   for (let i = 0; i < await row.count(); i++) {
  71 |     console.log(`Row ${i}:`, JSON.stringify(await row.nth(i).innerText()))
  72 |   }
  73 | 
  74 |   await expect(row).toContainText(['+$2,500.00', 'Bank', 'Salary'])
  75 |   console.log('PASS')
  76 | })
  77 | 
```