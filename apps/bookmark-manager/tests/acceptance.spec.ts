import { expect, test } from '@playwright/test'

test('[A1] page heading is "Bookmark Manager"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bookmark Manager' })).toBeVisible()
})

async function addBookmark(page: any, title: string, url: string, tags: string) {
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('URL').fill(url)
  await page.getByLabel('Tags').fill(tags)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A2] adding a bookmark adds a row to the table', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  const row = page.getByRole('row').filter({ hasText: 'Lacuna Docs' })
  await expect(row).toContainText('https://lacuna.dev/docs')
})

test('[A3] search filters the table', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  await page.getByLabel('Search bookmarks').fill('lac')
  await expect(page.getByRole('row').filter({ hasText: 'Lacuna Docs' })).toBeVisible()
})

test('[A4] clicking the Title column header sorts and re-sorts', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Beta', 'https://beta.example.com', 'b')
  await addBookmark(page, 'Alpha', 'https://alpha.example.com', 'a')
  const titleHeader = page.getByRole('columnheader', { name: 'Title' })
  await titleHeader.click()
  let rows = page.locator('tr').filter({ hasText: /https?:\/\// }).allInnerTexts()
  expect(rows.findIndex((t) => t.includes('Alpha'))).toBeLessThan(rows.findIndex((t) => t.includes('Beta')))
  await titleHeader.click()
  rows = await page.locator('tr').filter({ hasText: /https?:\/\// }).allInnerTexts()
  expect(rows.findIndex((t) => t.includes('Alpha'))).toBeGreaterThan(rows.findIndex((t) => t.includes('Beta')))
})

test('[A5] exporting CSV downloads the selected row', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  const row = page.getByRole('row').filter({ hasText: 'Lacuna Docs' })
  await row.locator('input[type="checkbox"]').first().check()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const content = readFileSync(path, 'utf8')
  expect(content).toContain('Lacuna Docs,https://lacuna.dev/docs,docs')
})

test('[A6] editing a bookmark updates the row', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  const row = page.getByRole('row').filter({ hasText: 'Lacuna Docs' })
  await row.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Lacuna Docs')
  await page.getByLabel('Title').fill('Lacuna Guide')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Lacuna Guide' })).toContainText('https://lacuna.dev/docs')
})

test('[A7] deleting the only bookmark shows the empty state', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Lacuna Docs', 'https://lacuna.dev/docs', 'docs')
  const row = page.getByRole('row').filter({ hasText: 'Lacuna Docs' })
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('No bookmarks yet')).toBeVisible()
})

test('[A8] a bookmark survives a reload', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Test Link', 'https://example.com', 'test')
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: 'Test Link' })
  await expect(row).toContainText('https://example.com')
})

test('[A9] reload keeps the bookmark in the table', async ({ page }) => {
  await page.goto('/')
  await addBookmark(page, 'Test Link', 'https://example.com', 'test')
  await page.reload()
  const row = page.getByRole('row').filter({ hasText: 'Test Link' })
  await expect(row).toContainText('https://example.com')
})
