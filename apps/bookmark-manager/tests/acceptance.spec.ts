import { expect, test, type Page } from '@playwright/test'

import { readFileSync } from 'node:fs'

async function addBookmark(page: Page, title: string, url: string, tags: string) {
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('URL').fill(url)
  await page.getByLabel('Tags').fill(tags)
  await page.getByRole('button', { name: 'Save' }).click()
}

function row(page: Page, title: string) {
  return page.getByRole('row').filter({ hasText: title })
}

test('[A1] the page heading is "Bookmark Manager"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bookmark Manager' })).toBeVisible()
})

test('[A2] adding a bookmark adds a row with its title and url', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  const r = row(page, 'Lacuna Docs')
  await expect(r).toContainText('Lacuna Docs')
  await expect(r).toContainText('https://lacuna.dev/docs')
})

test('[A3] typing in the Search bookmarks input filters the table', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  await addBookmark(page, 'Zeta Notes', 'https://zeta.example.com', 'notes')
  await page.getByLabel('Search bookmarks').fill('lac')
  await expect(row(page, 'Lacuna Docs')).toBeVisible()
  await expect(row(page, 'Zeta Notes')).toHaveCount(0)
})

test('[A4] rows are in insertion order, and the Title header sorts ascending then descending', async ({
  page,
}) => {
  await page.goto('/')
  await addBookmark(page, 'Beta Site', 'https://beta.example.com', 'b')
  await addBookmark(page, 'Alpha Site', 'https://alpha.example.com', 'a')
  const rows = await page.getByRole('row').allInnerTexts()
  expect(rows, 'initial insertion order').toHaveLength(3)
  expect(rows[1]).toContain('Beta Site')
  expect(rows[2]).toContain('Alpha Site')
  await page.getByRole('columnheader', { name: 'Title' }).click()
  const asc = await page.getByRole('row').allInnerTexts()
  expect(asc[1]).toContain('Alpha Site')
  expect(asc[2]).toContain('Beta Site')
  await page.getByRole('columnheader', { name: 'Title' }).click()
  const desc = await page.getByRole('row').allInnerTexts()
  expect(desc[1]).toContain('Beta Site')
  expect(desc[2]).toContain('Alpha Site')
})

test('[A5] ticking a row checkbox and clicking Export CSV downloads its csv line', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  await row(page, 'Lacuna Docs').getByLabel('Select Lacuna Docs').check()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const content = readFileSync((await download.path())!, 'utf8')
  expect(content).toContain('Lacuna Docs,https://lacuna.dev/docs,docs')
})

test('[A6] editing a bookmark pre-fills the form and saves the change', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  await row(page, 'Lacuna Docs').getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Lacuna Docs')
  await page.getByLabel('Title').fill('Lacuna Guide')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Lacuna Guide')).toBeVisible()
  await expect(row(page, 'Lacuna Docs')).toHaveCount(0)
})

test('[A7] deleting the only bookmark leaves the table empty', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Guide', 'https://lacuna.dev/guide', 'docs')
  await row(page, 'Lacuna Guide').getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(row(page, 'Lacuna Guide')).toHaveCount(0)
  await expect(page.getByText('No bookmarks yet')).toBeVisible()
})

test('[A8] an added bookmark survives a reload', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Test Link', 'https://example.com', 'test')
  await expect(row(page, 'Test Link')).toBeVisible()
  await page.reload()
  const r = row(page, 'Test Link')
  await expect(r).toContainText('Test Link')
  await expect(r).toContainText('https://example.com')
})

// A9: same as A8 in a fresh run; both assert the row persists across reload.
test('[A9] a separately added bookmark still shows after reload', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Test Link', 'https://example.com', 'test')
  await page.reload()
  const r = row(page, 'Test Link')
  await expect(r).toContainText('Test Link')
  await expect(r).toContainText('https://example.com')
})
