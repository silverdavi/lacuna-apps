// Acceptance tests for word-counter, derived from the spec's A1–A9 checks.
import { expect, test } from '@playwright/test'

const editor = (page: import('@playwright/test').Page) => page.getByLabel('Text')

test('[A1] heading and empty stats', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Word Counter', { exact: true })).toBeVisible()
  for (const label of [
    'Words: 0',
    'Characters: 0',
    'Sentences: 0',
    'Paragraphs: 0',
    'Reading time: 0 min',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test('[A2] typing a short sentence updates stats', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('Hello world. This is a test.')
  for (const label of [
    'Words: 6',
    'Characters: 28',
    'Sentences: 2',
    'Paragraphs: 1',
    'Reading time: 0 min',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test('[A3] twenty words, one sentence', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('')
  await editor(page).fill(
    'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty.'
  )
  for (const label of [
    'Words: 20',
    'Characters: 132',
    'Sentences: 1',
    'Paragraphs: 1',
    'Reading time: 0 min',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test('[A4] report tab shows a stats table', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('First paragraph.\n\nSecond paragraph.')
  await page.getByRole('tab', { name: 'Report' }).click()
  const table = page.getByRole('table')
  await expect(table.getByText('Words: 4', { exact: true })).toBeVisible()
  await expect(table.getByText('Characters: 35', { exact: true })).toBeVisible()
  await expect(table.getByText('Sentences: 2', { exact: true })).toBeVisible()
  await expect(table.getByText('Paragraphs: 2', { exact: true })).toBeVisible()
  await expect(table.getByText('Reading time: 0 min', { exact: true })).toBeVisible()
})

test('[A5] copy text puts raw text on the clipboard and toasts', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('Hello world.')
  await page.getByRole('button', { name: 'Copy text' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  await expect(
    page.getByText('Hello world.', { exact: true })
  ).toHaveCount(1)
})

test('[A6] download report produces a named file', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('Hello world.')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download report' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('word-counter-report.txt')
  const fs = await import('node:fs')
  const file = await download.path()
  const content = fs.readFileSync(file!, 'utf8')
  expect(content).toContain('Words: 2')
})

test('[A7] toggling Count punctuation off changes characters 12 to 11', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('Hello world.')
  await expect(page.getByText('Characters: 12', { exact: true })).toBeVisible()
  await page.getByLabel('Count punctuation').click()
  await expect(page.getByText('Characters: 11', { exact: true })).toBeVisible()
})

test('[A8] Clear empties the editor and zeroes the stats', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('Hello world.')
  await page.getByRole('button', { name: 'Clear' }).click()
  await expect(editor(page)).toHaveValue('')
  for (const label of [
    'Words: 0',
    'Characters: 0',
    'Sentences: 0',
    'Paragraphs: 0',
    'Reading time: 0 min',
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible()
  }
})

test('[A9] reload keeps the draft and the word count', async ({ page }) => {
  await page.goto('/')
  await editor(page).fill('Hello world.')
  await expect(page.getByText('Words: 2', { exact: true })).toBeVisible()
  await page.reload()
  await expect(editor(page)).toHaveValue('Hello world.')
  await expect(page.getByText('Words: 2', { exact: true })).toBeVisible()
})
