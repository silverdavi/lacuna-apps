import { expect, test } from '@playwright/test'

test('[A1] heading and initial stats panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Word Counter' })).toBeVisible()
  await expect(page.getByText('Words: 0')).toBeVisible()
  await expect(page.getByText('Characters: 0')).toBeVisible()
  await expect(page.getByText('Sentences: 0')).toBeVisible()
  await expect(page.getByText('Paragraphs: 0')).toBeVisible()
  await expect(page.getByText('Reading time: 0 min')).toBeVisible()
})

test('[A2] typing a short sentence updates stats', async ({ page }) => {
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('Hello world. This is a test.')
  await expect(page.getByText('Words: 6')).toBeVisible()
  await expect(page.getByText('Characters: 27')).toBeVisible()
  await expect(page.getByText('Sentences: 2')).toBeVisible()
  await expect(page.getByText('Paragraphs: 1')).toBeVisible()
  await expect(page.getByText('Reading time: 0 min')).toBeVisible()
})

test('[A3] twenty-word text rounds reading time to 1 min', async ({ page }) => {
  await page.goto('/')
  const text = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty.'
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('')
  await area.fill(text)
  await expect(page.getByText('Words: 20')).toBeVisible()
  await expect(page.getByText('Characters: 100')).toBeVisible()
  await expect(page.getByText('Sentences: 1')).toBeVisible()
  await expect(page.getByText('Paragraphs: 1')).toBeVisible()
  await expect(page.getByText('Reading time: 1 min')).toBeVisible()
})

test('[A4] report tab shows a stats table', async ({ page }) => {
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('First paragraph. Second paragraph.')
  await page.getByRole('tab', { name: 'Report' }).click()
  await expect(page.getByText('Words: 4')).toBeVisible()
  await expect(page.getByText('Characters: 31')).toBeVisible()
  await expect(page.getByText('Sentences: 2')).toBeVisible()
  await expect(page.getByText('Paragraphs: 2')).toBeVisible()
  await expect(page.getByText('Reading time: 0 min')).toBeVisible()
})

test('[A5] copy text puts the text on the clipboard and shows a toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('Hello world.')
  await page.getByRole('button', { name: 'Copy text' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  const clipboard = await page.evaluate(async () => navigator.clipboard.readText())
  expect(clipboard).toBe('Hello world.')
})

test('[A6] download report triggers a file download with expected content', async ({ page }) => {
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('Hello world.')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download report' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('word-counter-report.txt')
  const fs = await import('node:fs/promises')
  const content = await fs.readFile(await download.path(), 'utf8')
  expect(content).toContain('Words: 2')
})

test('[A7] toggling count punctuation off excludes punctuation from characters', async ({ page }) => {
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('Hello world.')
  await expect(page.getByText('Characters: 12')).toBeVisible()
  await page.getByRole('switch', { name: 'Count punctuation' }).click()
  await expect(page.getByText('Characters: 10')).toBeVisible()
})

test('[A8] clear button empties the editor and resets stats', async ({ page }) => {
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('Hello world.')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(area).toHaveValue('')
  await expect(page.getByText('Words: 0')).toBeVisible()
  await expect(page.getByText('Characters: 0')).toBeVisible()
  await expect(page.getByText('Sentences: 0')).toBeVisible()
  await expect(page.getByText('Paragraphs: 0')).toBeVisible()
  await expect(page.getByText('Reading time: 0 min')).toBeVisible()
})

test('[A9] reload keeps the draft and stats', async ({ page }) => {
  await page.goto('/')
  const area = page.getByRole('textbox', { name: 'Editor' })
  await area.fill('Hello world.')
  await page.reload()
  await expect(area).toHaveValue('Hello world.')
  await expect(page.getByText('Words: 2')).toBeVisible()
})
