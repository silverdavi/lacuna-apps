# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A5] generating with Alice, Bob, Carol shows Giver/Receiver columns with no self-pairing
- Location: tests/acceptance.spec.ts:43:1

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
  3   | async function addParticipant(page: Page, name: string) {
  4   |   await page.getByLabel('Name', { exact: true }).fill(name)
  5   |   await page.getByRole('button', { name: 'Add participant', exact: true }).click()
  6   | }
  7   | 
  8   | const pairings = (page: Page) => page.getByRole('table', { name: 'Pairings', exact: true })
  9   | 
  10  | test('[A1] heading "Secret Santa" and the "No participants yet" empty state', async ({ page }) => {
  11  |   await page.goto('/')
  12  |   await expect(page.getByRole('heading', { name: 'Secret Santa', exact: true })).toBeVisible()
  13  |   await expect(page.getByText('No participants yet', { exact: true })).toBeVisible()
  14  | })
  15  | 
  16  | test('[A2] adding "Alice" shows her row and the "1 participant" count', async ({ page }) => {
  17  |   await page.goto('/')
  18  |   await addParticipant(page, 'Alice')
  19  |   await expect(page.getByText('No participants yet', { exact: true })).toHaveCount(0)
  20  |   await expect(page.getByRole('row', { name: /Alice/ })).toBeVisible()
  21  |   await expect(page.getByText('1 participant', { exact: true })).toBeVisible()
  22  | })
  23  | 
  24  | test('[A3] adding "Bob" and "Carol" shows 3 rows and the "3 participants" count', async ({ page }) => {
  25  |   await page.goto('/')
  26  |   await addParticipant(page, 'Alice')
  27  |   await addParticipant(page, 'Bob')
  28  |   await addParticipant(page, 'Carol')
  29  |   await expect(page.getByRole('row', { name: /Alice/ })).toBeVisible()
  30  |   await expect(page.getByRole('row', { name: /Bob/ })).toBeVisible()
  31  |   await expect(page.getByRole('row', { name: /Carol/ })).toBeVisible()
  32  |   await expect(page.getByText('3 participants', { exact: true })).toBeVisible()
  33  | })
  34  | 
  35  | test('[A4] generating with only "Alice" shows "Need at least 2 participants"', async ({ page }) => {
  36  |   await page.goto('/')
  37  |   await addParticipant(page, 'Alice')
  38  |   await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  39  |   await expect(page.getByText('Need at least 2 participants', { exact: true })).toBeVisible()
  40  |   await expect(pairings(page)).toHaveCount(0)
  41  | })
  42  | 
  43  | test('[A5] generating with Alice, Bob, Carol shows Giver/Receiver columns with no self-pairing', async ({
  44  |   page,
  45  | }) => {
> 46  |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  47  |   await addParticipant(page, 'Alice')
  48  |   await addParticipant(page, 'Bob')
  49  |   await addParticipant(page, 'Carol')
  50  |   await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  51  |   const table = pairings(page)
  52  |   await expect(table).toBeVisible()
  53  |   await expect(table.getByRole('columnheader', { name: 'Giver', exact: true })).toBeVisible()
  54  |   await expect(table.getByRole('columnheader', { name: 'Receiver', exact: true })).toBeVisible()
  55  |   const rows = table.getByRole('row').filter({ hasNotText: 'Giver' })
  56  |   await expect(rows).toHaveCount(3)
  57  |   const names = ['Alice', 'Bob', 'Carol']
  58  |   for (const name of names) {
  59  |     const row = rows.filter({ hasText: name })
  60  |     const cells = row.getByRole('cell').allInnerTexts()
  61  |     const giver = cells[0].trim()
  62  |     const receiver = cells[1].trim()
  63  |     expect(receiver, `row for ${name}: receiver must not equal the giver`).not.toBe(giver)
  64  |   }
  65  | })
  66  | 
  67  | test('[A6] "No self-pairing" mode still pairs no one with themselves', async ({ page }) => {
  68  |   await page.goto('/')
  69  |   await addParticipant(page, 'Alice')
  70  |   await addParticipant(page, 'Bob')
  71  |   await addParticipant(page, 'Carol')
  72  |   await page.getByRole('tab', { name: 'Settings', exact: true }).click()
  73  |   await page.getByLabel('Pairing mode', { exact: true }).selectOption({ label: 'No self-pairing' })
  74  |   await page.getByRole('tab', { name: 'Participants', exact: true }).click()
  75  |   await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  76  |   const table = pairings(page)
  77  |   await expect(table).toBeVisible()
  78  |   const rows = table.getByRole('row').filter({ hasNotText: 'Giver' })
  79  |   await expect(rows).toHaveCount(3)
  80  |   for (const name of ['Alice', 'Bob', 'Carol']) {
  81  |     const row = rows.filter({ hasText: name })
  82  |     const cells = row.getByRole('cell').allInnerTexts()
  83  |     expect(cells[1].trim(), `row for ${name}: no self-pairing in "No self-pairing" mode`).not.toBe(name)
  84  |   }
  85  | })
  86  | 
  87  | test('[A7] "Copy pairings" shows the toast "Pairings copied to clipboard"', async ({ page, context }) => {
  88  |   await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  89  |   await page.goto('/')
  90  |   await addParticipant(page, 'Alice')
  91  |   await addParticipant(page, 'Bob')
  92  |   await addParticipant(page, 'Carol')
  93  |   await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  94  |   await page.getByRole('button', { name: 'Copy pairings', exact: true }).click()
  95  |   await expect(page.getByText('Pairings copied to clipboard', { exact: true })).toBeVisible()
  96  | })
  97  | 
  98  | test('[A8] deleting "Alice" removes her row and shows "2 participants"', async ({ page }) => {
  99  |   await page.goto('/')
  100 |   await addParticipant(page, 'Alice')
  101 |   await addParticipant(page, 'Bob')
  102 |   await addParticipant(page, 'Carol')
  103 |   await page.getByRole('button', { name: 'Delete Alice', exact: true }).click()
  104 |   await expect(page.getByRole('row', { name: /Alice/ })).toHaveCount(0)
  105 |   await expect(page.getByRole('row', { name: /Bob/ })).toBeVisible()
  106 |   await expect(page.getByRole('row', { name: /Carol/ })).toBeVisible()
  107 |   await expect(page.getByText('2 participants', { exact: true })).toBeVisible()
  108 | })
  109 | 
  110 | test('[A9] reload keeps the participants and the "3 participants" count', async ({ page }) => {
  111 |   await page.goto('/')
  112 |   await addParticipant(page, 'Alice')
  113 |   await addParticipant(page, 'Bob')
  114 |   await addParticipant(page, 'Carol')
  115 |   await page.reload()
  116 |   await expect(page.getByRole('row', { name: /Alice/ })).toBeVisible()
  117 |   await expect(page.getByRole('row', { name: /Bob/ })).toBeVisible()
  118 |   await expect(page.getByRole('row', { name: /Carol/ })).toBeVisible()
  119 |   await expect(page.getByText('3 participants', { exact: true })).toBeVisible()
  120 | })
  121 | 
```