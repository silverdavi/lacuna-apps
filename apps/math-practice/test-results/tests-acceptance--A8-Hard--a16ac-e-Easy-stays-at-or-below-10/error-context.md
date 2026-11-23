# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A8] Hard difficulty yields operands greater than 20 where Easy stays at or below 10
- Location: tests/acceptance.spec.ts:142:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  1   | // Acceptance tests for the math-practice app, derived from the spec's checks A1-A9.
  2   | // Expected values are copied verbatim from the spec.
  3   | import { expect, test, type Page } from '@playwright/test'
  4   | 
  5   | async function openGenerate(page: Page) {
> 6   |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  7   |   await page.getByRole('tab', { name: 'Generate' }).click()
  8   | }
  9   | 
  10  | async function generateFive(page: Page) {
  11  |   await page.getByLabel('Operations').selectOption('Addition')
  12  |   await page.getByLabel('Count').fill('5')
  13  |   await page.getByRole('button', { name: 'Generate' }).click()
  14  | }
  15  | 
  16  | // A2/A4/A8: the question text is the visible text of a list item, read after
  17  | // the user clicks Generate.
  18  | async function questionTexts(page: Page): Promise<string[]> {
  19  |   return page.getByRole('listitem').allTextContents()
  20  | }
  21  | 
  22  | test('[A1] the page heading is "Math Practice"', async ({ page }) => {
  23  |   await page.goto('/')
  24  |   await expect(page.getByRole('heading', { name: 'Math Practice' })).toBeVisible()
  25  | })
  26  | 
  27  | test('[A2] generating 5 Addition problems produces 5 questions of the form "n + n ="', async ({ page }) => {
  28  |   await openGenerate(page)
  29  |   await generateFive(page)
  30  |   const questions = await questionTexts(page)
  31  |   expect(questions.length, 'five questions are listed').toBe(5)
  32  |   for (const q of questions) expect(q.trim(), `question "${q}" matches \\d+ \\+ \\d+ =`).toMatch(/^\d+ \+ \d+ =$/)
  33  | })
  34  | 
  35  | test('[A3] Print Sheet opens a print view containing the heading and the 5 questions', async ({ page }) => {
  36  |   await openGenerate(page)
  37  |   await generateFive(page)
  38  |   const questions = await questionTexts(page)
  39  |   await page.getByRole('button', { name: 'Print Sheet' }).click()
  40  |   // read the print destination after the user action; no page mutation
  41  |   const isPrint = await page.evaluate(() => window.matchMedia('print').matches)
  42  |   if (isPrint) {
  43  |     const frame = page.frames().find((f) => f.url() !== page.url())
  44  |     const target = frame ?? page
  45  |     await expect(target.getByRole('heading', { name: 'Math Practice' })).toBeVisible()
  46  |     for (const q of questions) await expect(target.getByText(q.trim())).toBeVisible()
  47  |     return
  48  |   }
  49  |   // no separate print view: the app renders the sheet in the page for printing
  50  |   await expect(page.getByRole('heading', { name: 'Math Practice' })).toBeVisible()
  51  |   for (const q of questions) await expect(page.getByText(q.trim())).toBeVisible()
  52  | })
  53  | 
  54  | test('[A4] answering the first question and checking shows Correct or Incorrect', async ({ page }) => {
  55  |   await openGenerate(page)
  56  |   await generateFive(page)
  57  |   await page.getByRole('tab', { name: 'Study' }).click()
  58  |   const [text] = await questionTexts(page)
  59  |   const m = text.trim().match(/^(\d+) \+ (\d+) =$/)
  60  |   expect(m, `first question "${text}" parses as a sum`).not.toBeNull()
  61  |   const sum = Number(m![1]) + Number(m![2])
  62  |   // A4 reads oddly: "if the sum of the displayed numbers is 10" only holds when
  63  |   // the numbers sum to 10; the Signature reading is that the feedback must agree
  64  |   // with the displayed sum, so assert against the displayed sum.
  65  |   await page.getByLabel('Answer').fill('10')
  66  |   await page.getByRole('button', { name: 'Check' }).click()
  67  |   const expected = sum === 10 ? 'Correct' : 'Incorrect'
  68  |   await expect(page.getByText(expected).first()).toBeVisible()
  69  | })
  70  | 
  71  | test('[A5] after answering all 5 questions the Results tab shows one row per question', async ({ page }) => {
  72  |   await openGenerate(page)
  73  |   await generateFive(page)
  74  |   await page.getByRole('tab', { name: 'Study' }).click()
  75  |   const questions = await questionTexts(page)
  76  |   for (let i = 0; i < 5; i++) {
  77  |     await page.getByLabel('Answer').nth(i).fill('0')
  78  |     await page.getByRole('button', { name: 'Check' }).click()
  79  |     // Next advances to the following question
  80  |     await page.getByRole('button', { name: 'Next' }).click()
  81  |   }
  82  |   const resultsTab = page.getByRole('tab', { name: 'Results' })
  83  |   await expect(resultsTab).toBeEnabled()
  84  |   await resultsTab.click()
  85  |   const table = page.getByRole('table').first()
  86  |   await expect(table.getByRole('row').first()).toContainText(/Question/i)
  87  |   const rows = table.getByRole('row')
  88  |   await expect(rows).toHaveCount(6) // header + 5 questions
  89  |   for (const q of questions) await expect(rows.filter({ hasText: q.trim() })).toHaveCount(1)
  90  |   for (let i = 1; i <= 5; i++) {
  91  |     const status = await table.getByRole('row').nth(i).innerText()
  92  |     expect(status, `row ${i} has a status`).toMatch(/Correct|Incorrect/)
  93  |   }
  94  | })
  95  | 
  96  | test('[A6] the Results summary shows "Score: X/5" matching the correct count', async ({ page }) => {
  97  |   await openGenerate(page)
  98  |   await generateFive(page)
  99  |   await page.getByRole('tab', { name: 'Study' }).click()
  100 |   const questions = await questionTexts(page)
  101 |   let correct = 0
  102 |   for (let i = 0; i < 5; i++) {
  103 |     const m = questions[i].trim().match(/^(\d+) \+ (\d+) =$/)
  104 |     expect(m, `question ${i + 1} parses`).not.toBeNull()
  105 |     const sum = Number(m![1]) + Number(m![2])
  106 |     const input = page.getByLabel('Answer').nth(i)
```