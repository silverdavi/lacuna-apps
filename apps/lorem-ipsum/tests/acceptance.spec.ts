import { expect, test, type Page } from '@playwright/test'

// The generated output is shown in a text area or a <pre> in the Generate tab;
// read it after the user generates, as a read-only page inspection.
async function outputText(page: Page): Promise<string> {
  return await page.evaluate(() => {
    const el = document.querySelector<HTMLTextAreaElement | HTMLElement>('textarea, pre')
    return el ? el.value ?? el.textContent ?? '' : ''
  })
}

test('[A1] the page heading is "Lorem Ipsum Generator" and the Generate tab is active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Lorem Ipsum Generator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Generate' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] two paragraphs start with "Lorem ipsum dolor sit amet" and contain exactly two paragraph breaks', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Paragraphs')
  await page.getByLabel('Count').fill('2')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await outputText(page)
  expect(text.startsWith('Lorem ipsum dolor sit amet')).toBe(true)
  // Two paragraphs are "two lines of text separated by a blank line":
  // one blank line between them, i.e. exactly two line breaks total.
  expect(text.split('\n')).toHaveLength(3)
  expect(text.split('\n')[0].length).toBeGreaterThan(0)
  expect(text.split('\n')[1]).toBe('')
  expect(text.split('\n')[2].length).toBeGreaterThan(0)
})

test('[A3] five words are exactly five space-separated words with no trailing newline', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Words')
  await page.getByLabel('Count').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await outputText(page)
  expect(text.split(' ')).toHaveLength(5)
  expect(text.endsWith('\n')).toBe(false)
})

test('[A4] seed 42, one sentence, generates the exact sentence', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByLabel('Unit').selectOption('Sentences')
  await page.getByLabel('Count').fill('1')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await outputText(page)
  expect(text).toBe('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
})

test('[A5] Copy changes the label to "Copied" for 1.5 seconds and the clipboard holds the generated text', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Words')
  await page.getByLabel('Count').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  const copy = page.getByRole('button', { name: 'Copy' })
  const start = Date.now()
  await copy.click()
  await expect(copy).toHaveText('Copied')
  await expect(copy).toHaveText('Copy')
  const elapsed = Date.now() - start
  // The spec fixes the "Copied" lifetime at 1.5 seconds; the wait round trips
  // add slack, so cap the total well below an indefinite hang.
  expect(elapsed).toBeGreaterThanOrEqual(1500)
  expect(elapsed).toBeLessThan(3000)
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe(await outputText(page))
})

test('[A6] Download triggers a file named "lorem-ipsum.txt" containing the generated text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Words')
  await page.getByLabel('Count').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await outputText(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('lorem-ipsum.txt')
  const { readFileSync } = await import('node:fs')
  const body = readFileSync((await download.path())!, 'utf8')
  expect(body).toBe(text)
})

test('[A7] "Save to list" adds an item to the Saved tab with the first 40 characters', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Sentences')
  await page.getByLabel('Count').fill('2')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await outputText(page)
  await page.getByRole('button', { name: 'Save to list' }).click()
  await page.getByRole('tab', { name: 'Saved' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: text.slice(0, 40) })).toBeVisible()
})

test('[A8] "Delete" removes the first saved item and "No saved snippets" is shown when none remain', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Words')
  await page.getByLabel('Count').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Save to list' }).click()
  await page.getByRole('tab', { name: 'Saved' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.getByRole('button', { name: 'Delete' }).first().click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No saved snippets')).toBeVisible()
})

test('[A9] a reload keeps the saved snippet with the same first 40 characters', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption('Sentences')
  await page.getByLabel('Count').fill('2')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await outputText(page)
  await page.getByRole('button', { name: 'Save to list' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'Saved' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: text.slice(0, 40) })).toBeVisible()
})
