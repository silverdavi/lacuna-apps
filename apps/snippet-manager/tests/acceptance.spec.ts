import { expect, test, type Page } from '@playwright/test'

async function addSnippet(
  page: Page,
  title: string,
  language: string,
  code: string,
  tag: string,
) {
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Language').fill(language)
  await page.getByRole('textbox', { name: 'Code editor' }).fill(code)
  await page.getByRole('textbox', { name: 'Add tag' }).fill(tag)
  await page.getByRole('textbox', { name: 'Add tag' }).press('Enter')
  await page.getByRole('button', { name: 'Save snippet' }).click()
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Code Snippet Manager' })).toBeVisible()
  await expect(page.getByText('No snippets yet')).toBeVisible()
})

test('[A2] saving a snippet adds a list item', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await expect(page.getByText('Hello World')).toBeVisible()
  await expect(page.getByText('JavaScript')).toBeVisible()
  await expect(page.getByText('No snippets yet')).toHaveCount(0)
})

test('[A3] adding a second snippet shows two items', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await expect(page.getByText('Hello World')).toBeVisible()
  await expect(page.getByText('Sort Array')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('[A4] search filters by fuzzy match', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByLabel('Search snippets').fill('hello')
  await expect(page.getByText('Hello World')).toBeVisible()
  await expect(page.getByText('Sort Array')).toHaveCount(0)
})

test('[A5] no-match search shows empty state', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByLabel('Search snippets').fill('xyz')
  await expect(page.getByText('No snippets match')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
})

test('[A6] clicking a tag filters the list', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByRole('button', { name: 'demo' }).click()
  await expect(page.getByText('Hello World')).toBeVisible()
  await expect(page.getByText('Sort Array')).toHaveCount(0)
})

test('[A7] deleting a snippet removes it from the list', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await addSnippet(page, 'Sort Array', 'Python', 'def sort(a): return sorted(a)', 'utils')
  await page.getByRole('button', { name: 'Delete Hello World' }).click()
  await expect(page.getByText('Hello World')).toHaveCount(0)
  await expect(page.getByText('Sort Array')).toBeVisible()
})

test('[A8] copying a snippet places its code on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addSnippet(page, 'Copy Test', 'TypeScript', 'const x = 1', 'test')
  await page.getByRole('button', { name: 'Copy code' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('const x = 1')
})

test('[A9] reload keeps the saved snippet', async ({ page }) => {
  await page.goto('/')
  await addSnippet(page, 'Hello World', 'JavaScript', "console.log('hi')", 'demo')
  await page.reload()
  await expect(page.getByText('Hello World')).toBeVisible()
  await expect(page.getByText('JavaScript')).toBeVisible()
})
