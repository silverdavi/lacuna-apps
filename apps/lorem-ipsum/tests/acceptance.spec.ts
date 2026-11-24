import { expect, test, type Page } from '@playwright/test'

// The spec pins seed 42 with one sentence to an exact sentence (A4) but does not
// pin the seed for the paragraph/word cases, so A2/A3 assert the spec-stated
// prefix/word-count; no two checks contradict.

function output(page: Page) {
  return page.locator('pre')
}

test('[A1] page heading is "Lorem Ipsum Generator" and the Generate tab is active', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Lorem Ipsum Generator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Generate' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] two paragraphs start "Lorem ipsum dolor sit amet" with two paragraph breaks', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Paragraphs' })
  await page.getByLabel('Count').fill('2')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await output(page).innerText()
  expect(text).toContain('Lorem ipsum dolor sit amet')
  expect(text.split(/\n{2,}/).filter((p) => p.length > 0)).toHaveLength(2)
})

test('[A3] five words are exactly five words with no trailing newline', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Words' })
  await page.getByLabel('Count').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await output(page).innerText()
  expect(text).not.toMatch(/\n/)
  expect(text.split(' ')).toHaveLength(5)
})

test('[A4] seed 42 with one sentence is the exact seeded sentence', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  await page.getByLabel('Count').fill('1')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(output(page)).toHaveText('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
})

test('[A5] Copy shows "Copied" for 1.5s and puts the text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  await page.getByLabel('Count').fill('3')
  await page.getByRole('button', { name: 'Generate' }).click()
  const copy = page.getByRole('button', { name: 'Copy' })
  await copy.click()
  await expect(copy).toHaveText('Copied')
  const restored = page.getByRole('button', { name: 'Copy' })
  await expect(restored).toBeVisible({ timeout: 5000 })
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Lorem ipsum dolor sit amet')
})

test('[A6] Download saves the generated text as lorem-ipsum.txt', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  await page.getByLabel('Count').fill('2')
  await page.getByRole('button', { name: 'Generate' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('lorem-ipsum.txt')
  const content = await download.path()
  const fs = await import('node:fs')
  expect(fs.readFileSync(content!, 'utf8')).toContain('Lorem ipsum dolor sit amet')
})

test('[A7] Save to list adds an item with the first 40 characters of the text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  await page.getByLabel('Count').fill('3')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Save to list' }).click()
  await page.getByRole('tab', { name: 'Saved' }).click()
  const first40 = await page.evaluate(() => (document.querySelector('pre')?.textContent ?? '').slice(0, 40))
  expect(first40.length).toBe(40)
  await expect(page.getByRole('listitem').filter({ hasText: first40 })).toHaveCount(1)
})

test('[A8] Delete removes the first item and shows "No saved snippets" when empty', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  await page.getByLabel('Count').fill('3')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Save to list' }).click()
  await page.getByRole('tab', { name: 'Saved' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await page.getByRole('listitem').first().getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  await expect(page.getByText('No saved snippets')).toBeVisible()
})

test('[A9] a saved snippet survives a reload with the same first 40 characters', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Unit').selectOption({ label: 'Sentences' })
  await page.getByLabel('Count').fill('3')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Save to list' }).click()
  const first40 = await page.evaluate(() => (document.querySelector('pre')?.textContent ?? '').slice(0, 40))
  expect(first40.length).toBe(40)
  await page.reload()
  await page.getByRole('tab', { name: 'Saved' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: first40 })).toHaveCount(1)
})
