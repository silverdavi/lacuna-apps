import { expect, test, type Page } from '@playwright/test'

async function addSnippet(page: Page, title: string, language: string, code: string, tag: string) {
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Language').fill(language)
  await page.locator('textarea').first().fill(code)
  await page.locator('input:not([type="hidden"])').last().fill(tag)
  await page.locator('input:not([type="hidden"])').last().press('Enter')
  await page.getByRole('button', { name: 'Save snippet' }).click()
}

test('[A1] empty state shows heading and empty list message', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Code Snippet Manager' })).toBeVisible()
  await expect(page.getByText('No snippets yet')).toBeVisible()
})

test('[A2] saving a snippet adds a list item with title and language', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toContainText('JavaScript')
  await expect(page.getByText('No snippets yet')).toHaveCount(0)
})

test('[A3] adding a second snippet shows both items', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Sort Array' })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('[A4] search filters the list by fuzzy match', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByLabel('Search snippets').fill('hello')
  await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Sort Array' })).toHaveCount(0)
})

test('[A5] a search with no matches shows the no-match message', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await page.getByLabel('Search snippets').fill('xyz')
  await expect(page.getByText('No snippets match')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A6] clicking a tag in the filter bar filters by tag', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByRole('button', { name: 'demo' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Sort Array' })).toHaveCount(0)
})

test('[A7] the delete button removes the snippet', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByRole('button', { name: 'Delete Hello World' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Sort Array' })).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(1)
})

test('[A8] copy code puts the snippet content on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addSnippet(page, 'Copy Test', 'TypeScript', 'const x = 1', 'test')
  await page.getByRole('button', { name: 'Copy code' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('const x = 1')
})

test('[A9] the snippet persists across a reload', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Hello World' })).toContainText('JavaScript')
})
