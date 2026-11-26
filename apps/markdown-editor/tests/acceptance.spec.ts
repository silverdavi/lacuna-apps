import { expect, test } from '@playwright/test'

test('[A1] heading, Write/Preview tabs, Write active by default with 0 words', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Markdown Editor' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Write' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Preview' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Write' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('0 words')).toBeVisible()
})

test('[A2] typing "# Hello" updates word count to 1 words and renders heading', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.fill('# Hello')
  await expect(page.getByText('1 words')).toBeVisible()
  await page.getByRole('tab', { name: 'Preview' }).click()
  const heading = page.getByRole('heading', { name: 'Hello' })
  await expect(heading).toBeVisible()
  await expect(heading).toHaveText('Hello')
})

test('[A3] task list: preview shows two unchecked boxes; clicking the first updates editor text', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.fill('- [ ] Buy milk\n- [ ] Walk dog')
  await page.getByRole('tab', { name: 'Preview' }).click()
  const boxes = page.locator('input[type="checkbox"]')
  await expect(boxes).toHaveCount(2)
  await expect(boxes.nth(0)).not.toBeChecked()
  await expect(boxes.nth(1)).not.toBeChecked()
  await boxes.nth(0).click()
  await page.getByRole('tab', { name: 'Write' }).click()
  await expect(editor).toHaveText('- [x] Buy milk\n- [ ] Walk dog')
})

test('[A4] table markdown renders table with header cells and body cell', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.fill('| Name | Age |\n|------|-----|\n| Alice | 30 |')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('table')).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Age' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Alice' })).toBeVisible()
})

test('[A5] **bold** renders strong and *italic* renders em', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await page.getByRole('tab', { name: 'Preview' }).click()
  await editor.fill('**bold**')
  await expect(page.locator('strong', { hasText: 'bold' })).toHaveCount(1)
  await editor.fill('*italic*')
  await expect(page.locator('em', { hasText: 'italic' })).toHaveCount(1)
})

test('[A6] four-space indented line renders inside a pre tag', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.fill('    indented code')
  await page.getByRole('tab', { name: 'Preview' }).click()
  const pre = page.locator('pre').filter({ has: page.getByText('indented code') })
  await expect(pre).toHaveCount(1)
})

test('[A7] Export downloads document.md with the exact editor text', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.fill('# Export test')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('document.md')
  const stream = await download.createReadStream()
  let content = ''
  for await (const chunk of stream) content += chunk.toString('utf8')
  expect(content).toBe('# Export test')
})

test('[A8] Ctrl+Z after typing "# Test" reverts to empty state and 0 words', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.click()
  await page.keyboard.type('# Test')
  await page.keyboard.press('Control+z')
  await expect(editor).toHaveText('')
  await expect(page.getByText('0 words')).toBeVisible()
})

test('[A9] reload keeps document text and word count', async ({ page }) => {
  await page.goto('/')
  const editor = page.locator('textarea').first()
  await editor.fill('# Saved')
  await page.reload()
  await expect(editor).toHaveText('# Saved')
  await expect(page.getByText('1 words')).toBeVisible()
})
