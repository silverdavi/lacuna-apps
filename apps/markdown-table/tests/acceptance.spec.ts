import { expect, test, type Page } from '@playwright/test'

function rows(page: Page) {
  return page.getByRole('table', { name: 'Output' }).getByRole('row')
}

test('[A1] three-line table shows data rows, skipping the separator', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|A|B|C|\n|---|---|---|\n|1|2|3|')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['A, B, C', '1, 2, 3'])
})

test('[A2] two-column table shows two data rows', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|X|Y|\n|---|---|\n|a|b|')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['X, Y', 'a, b'])
})

test('[A3] a single line with no separator shows one row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|1|2|3|')
  await expect(rows(page)).toHaveCount(1)
  await expect(rows(page)).toHaveText(['1, 2, 3'])
})

test('[A4] empty input shows no rows', async ({ page }) => {
  await page.goto('/')
  await expect(rows(page)).toHaveCount(0)
})

test('[A5] table with a separator shows the data rows only', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|A|B|\n|---|---|\n|C|D|')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['A, B', 'C, D'])
})

test('[A6] three-column table shows two data rows', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|X|Y|Z|\n|---|---|---|\n|1|2|3|')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['X, Y, Z', '1, 2, 3'])
})

test('[A7] trailing newline after the last row does not add a row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|A|B|\n|---|---|\n|C|D|\n')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['A, B', 'C, D'])
})

test('[A8] spaces inside cells are trimmed', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('| A | B |\n|---|---|\n| C | D |')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['A, B', 'C, D'])
})

test('[A9] input and output survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Markdown table').fill('|A|B|\n|---|---|\n|C|D|')
  await page.reload()
  await expect(page.getByLabel('Markdown table')).toHaveText('|A|B|\n|---|---|\n|C|D|')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page)).toHaveText(['A, B', 'C, D'])
})
