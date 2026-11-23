import { expect, test, type Page } from '@playwright/test'

async function open(page: Page) {
  await page.goto('/')
}

async function paste(page: Page, text: string) {
  const box = page.getByRole('textbox').first()
  await box.fill(text)
}

async function rows(page: Page) {
  return page.locator('[role="row"]')
}

test('[A1] pasting a three-row pipe table shows the two data rows', async ({ page }) => {
  await open(page)
  await paste(page, '|A|B|C|\n|---|---|---|\n|1|2|3|')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await expect(row.nth(0)).toHaveText('A, B, C')
  await expect(row.nth(1)).toHaveText('1, 2, 3')
})

test('[A2] pasting a two-row pipe table shows the two data rows', async ({ page }) => {
  await open(page)
  await paste(page, '|X|Y|\n|---|---|\n|a|b|')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await expect(row.nth(0)).toHaveText('X, Y')
  await expect(row.nth(1)).toHaveText('a, b')
})

test('[A3] a single line with no separator shows one row', async ({ page }) => {
  await open(page)
  await paste(page, '|1|2|3|')
  const row = rows(page)
  await expect(row).toHaveCount(1)
  await expect(row.nth(0)).toHaveText('1, 2, 3')
})

test('[A4] pasting an empty string shows no output', async ({ page }) => {
  await open(page)
  await paste(page, '')
  await expect(rows(page)).toHaveCount(0)
})

test('[A5] a two-row pipe table shows the two data rows', async ({ page }) => {
  await open(page)
  await paste(page, '|A|B|\n|---|---|\n|C|D|')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await expect(row.nth(0)).toHaveText('A, B')
  await expect(row.nth(1)).toHaveText('C, D')
})

test('[A6] a header, separator and data row show the two data rows', async ({ page }) => {
  await open(page)
  await paste(page, '|X|Y|Z|\n|---|---|---|\n|1|2|3|')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await expect(row.nth(0)).toHaveText('X, Y, Z')
  await expect(row.nth(1)).toHaveText('1, 2, 3')
})

// [A7] The spec says "with a trailing newline"; the extra newline is part of the
// input and the result is the same two rows, asserted as written.
test('[A7] a two-row pipe table with a trailing newline shows the two data rows', async ({ page }) => {
  await open(page)
  await paste(page, '|A|B|\n|---|---|\n|C|D|\n')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await expect(row.nth(0)).toHaveText('A, B')
  await expect(row.nth(1)).toHaveText('C, D')
})

// [A8] The spec says "extra spaces in cells"; the exact spacing is unspecified,
// so the input pads the cells and the result is asserted as written in the spec.
test('[A8] extra spaces in cells are trimmed and the two data rows show', async ({ page }) => {
  await open(page)
  await paste(page, '| A | B |\n|---|---|\n| C | D |')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await expect(row.nth(0)).toHaveText('A, B')
  await expect(row.nth(1)).toHaveText('C, D')
})

test('[A9] reload keeps the input text and output table visible', async ({ page }) => {
  await open(page)
  await paste(page, '|A|B|C|\n|---|---|---|\n|1|2|3|')
  const row = rows(page)
  await expect(row).toHaveCount(2)
  await page.reload()
  await expect(page.getByRole('textbox').first()).toHaveValue('|A|B|C|\n|---|---|---|\n|1|2|3|')
  await expect(rows(page)).toHaveCount(2)
  await expect(rows(page).nth(0)).toHaveText('A, B, C')
  await expect(rows(page).nth(1)).toHaveText('1, 2, 3')
})
