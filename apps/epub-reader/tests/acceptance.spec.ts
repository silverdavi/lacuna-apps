import { expect, test, type Page } from '@playwright/test'

async function loadBook(page: Page, content: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Choose file' }).click(),
  ])
  const file = new File([content], 'test.epub', { type: 'application/epub+zip' })
  await (chooser as unknown as { setFiles(files: File[]): Promise<void> }).setFiles([file])
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'EPUB Reader' })).toBeVisible()
  await expect(page.getByText('No book loaded')).toBeVisible()
})

test('[A2] loading a book shows the title and page 1 text', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await expect(page.getByText('test.epub')).toBeVisible()
  await expect(page.getByText('Hello World')).toBeVisible()
})

test('[A3] next page advances to page 2 of 5', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Page 2 of 5')).toBeVisible()
  await expect(page.getByText('Hello World')).toBeVisible()
})

test('[A4] adding a bookmark on page 3', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await expect(page.getByText('Page 3')).toBeVisible()
  await expect(page.getByText('No bookmarks')).toHaveCount(0)
})

test('[A5] deleting the page 3 bookmark', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByRole('button', { name: 'Delete Page 3' }).click()
  await expect(page.getByText('No bookmarks')).toBeVisible()
})

test('[A6] exporting the page copies its text', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export page' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('Hello World')
  await expect(page.getByText('Copied page text')).toBeVisible()
})

test('[A7] changing font size to Large', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await page.getByRole('button', { name: 'Next page' }).click()
  const reader = page.getByText('Hello World')
  const before = Number(await reader.evaluate((el) => getComputedStyle(el).fontSize))
  await page.getByLabel('Font size').selectOption('Large')
  const after = Number(await reader.evaluate((el) => getComputedStyle(el).fontSize))
  expect(after).toBeGreaterThan(before)
})

test('[A8] reload restores book, page and position', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.reload()
  await expect(page.getByText('test.epub')).toBeVisible()
  await expect(page.getByText('Page 3 of 5')).toBeVisible()
})

test('[A9] reload keeps the page 3 bookmark', async ({ page }) => {
  await page.goto('/')
  await loadBook(page, 'Hello World')
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.reload()
  await expect(page.getByText('test.epub')).toBeVisible()
  await expect(page.getByText('Page 3')).toBeVisible()
})
