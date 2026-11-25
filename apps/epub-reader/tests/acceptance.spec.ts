import { expect, test, type Page } from '@playwright/test'

function fixture() {
  return {
    name: 'test.epub',
    mimeType: 'application/epub+zip',
    buffer: Buffer.from('Hello World\fSecond page\fThird page\fFourth page\fFifth page'),
  }
}

async function upload(page: Page) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Choose file' }).click(),
  ])
  await chooser.setFiles(fixture())
}

async function gotoAndUpload(page: Page) {
  await page.goto('/')
  await upload(page)
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'EPUB Reader' })).toBeVisible()
  await expect(page.getByText('No book loaded')).toBeVisible()
})

test('[A2] load book shows filename, progress, and page 1', async ({ page }) => {
  await gotoAndUpload(page)
  await expect(page.getByText('test.epub')).toBeVisible()
  await expect(page.getByText('Page 1 of 5')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Reader' })).toContainText('Hello World')
})

test('[A3] next page shows page 2', async ({ page }) => {
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Page 2 of 5')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Reader' })).toContainText('Second page')
})

test('[A4] add bookmark for page 3', async ({ page }) => {
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  const bookmarks = page.getByRole('list', { name: 'Bookmarks' })
  await expect(bookmarks.getByText('Page 3')).toBeVisible()
  await expect(bookmarks.getByText('No bookmarks')).toHaveCount(0)
})

test('[A5] delete bookmark removes item', async ({ page }) => {
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.getByRole('button', { name: 'Delete Page 3' }).click()
  await expect(page.getByRole('list', { name: 'Bookmarks' }).getByText('No bookmarks')).toBeVisible()
})

test('[A6] export page copies text to clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Export page' }).click()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('Hello World')
  await expect(page.getByText('Copied page text')).toBeVisible()
})

test('[A7] font size select changes computed font size', async ({ page }) => {
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  const reader = page.getByRole('region', { name: 'Reader' })
  const defaultSize = parseFloat(await reader.evaluate((el) => getComputedStyle(el).fontSize))
  await page.getByLabel('Font size').selectOption({ label: 'Large' })
  const largeSize = parseFloat(await reader.evaluate((el) => getComputedStyle(el).fontSize))
  expect(largeSize).toBeGreaterThan(defaultSize)
  await expect(reader).toContainText('Second page')
})

test('[A8] reload restores loaded book and page', async ({ page }) => {
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.reload()
  await expect(page.getByText('test.epub')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Reader' })).toContainText('Third page')
  await expect(page.getByText('Page 3 of 5')).toBeVisible()
})

test('[A9] reload preserves bookmarks', async ({ page }) => {
  await gotoAndUpload(page)
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Next page' }).click()
  await page.getByRole('button', { name: 'Add bookmark' }).click()
  await page.reload()
  await expect(page.getByText('test.epub')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Bookmarks' }).getByText('Page 3')).toBeVisible()
})
