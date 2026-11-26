import { expect, test, type Page } from '@playwright/test'

async function analyze(page: Page, text: string) {
  await page.getByLabel('Input text').fill(text)
}

test('[A1] page heading reads "Text Readability Score"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Text Readability Score' })).toBeVisible()
})

test('[A2] stats show word, sentence, paragraph and character counts', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The cat sat on the mat.')
  await expect(page.getByText('Words: 6')).toBeVisible()
  await expect(page.getByText('Sentences: 1')).toBeVisible()
  await expect(page.getByText('Paragraphs: 1')).toBeVisible()
  await expect(page.getByText('Characters: 24')).toBeVisible()
})

test('[A3] Flesch Reading Ease is 90.0 and Flesch-Kincaid Grade Level is 0.0 for "The cat sat on the mat."', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The cat sat on the mat.')
  await expect(page.getByText('90.0')).toBeVisible()
  await expect(page.getByText('0.0')).toBeVisible()
})

test('[A4] "The quick brown fox..." shows Words: 16, Sentences: 2 and Flesch Reading Ease 80.5', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The quick brown fox jumps over the lazy dog. It was a very good day.')
  await expect(page.getByText('Words: 16')).toBeVisible()
  await expect(page.getByText('Sentences: 2')).toBeVisible()
  await expect(page.getByText('80.5')).toBeVisible()
})

test('[A5] Gunning Fog toggle shows and hides the Gunning Fog score row', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The cat sat on the mat.')
  const checkbox = page.getByRole('checkbox', { name: 'Gunning Fog' })
  await checkbox.check()
  // Checked: the checkbox label and the results row both read "Gunning Fog".
  await expect(page.getByText('Gunning Fog')).toHaveCount(2)
  await checkbox.uncheck()
  // Unchecked: only the checkbox label remains; the results row is gone.
  await expect(page.getByText('Gunning Fog')).toHaveCount(1)
})

test('[A6] Copy report shows a toast and copies a report starting with "Text Readability Report"', async ({ page, context }) => {
  await page.goto('/')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await analyze(page, 'The cat sat on the mat.')
  await page.getByRole('button', { name: 'Copy report' }).click()
  await expect(page.getByText('Report copied to clipboard')).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard.split('\n')[0]).toBe('Text Readability Report')
})

test('[A7] Download .txt downloads readability-report.txt whose first line is "Text Readability Report"', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The cat sat on the mat.')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download .txt' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('readability-report.txt')
  const saved = '/tmp/readability-report-download.txt'
  await download.saveAs(saved)
  const { readFileSync, unlinkSync } = await import('node:fs')
  const content = readFileSync(saved, 'utf8')
  unlinkSync(saved)
  expect(content.split('\n')[0]).toBe('Text Readability Report')
})

test('[A8] History shows the analysis and Clear history shows "No analyses yet"', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The cat sat on the mat.')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('The cat sat on the mat.')).toBeVisible()
  await expect(page.getByText('90.0')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('No analyses yet')).toBeVisible()
})

test('[A9] reload keeps the editor text and the Gunning Fog checkbox state', async ({ page }) => {
  await page.goto('/')
  await analyze(page, 'The cat sat on the mat.')
  const checkbox = page.getByRole('checkbox', { name: 'Gunning Fog' })
  await checkbox.check()
  await page.reload()
  await expect(page.getByLabel('Input text')).toHaveValue('The cat sat on the mat.')
  await expect(checkbox).toBeChecked()
})
