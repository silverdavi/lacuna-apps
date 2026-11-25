import { expect, test, type Page } from '@playwright/test'

async function addWord(page: Page, word: string, definition: string) {
  await page.getByLabel('Word').fill(word)
  await page.getByLabel('Definition').fill(definition)
  await page.getByRole('button', { name: 'Add word' }).click()
}

test('[A1] the page shows the heading and the tab labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Vocabulary Builder' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Deck' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Study' })).toBeVisible()
})

test('[A2] adding a word adds a list item with the word and its definition', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  const item = page.getByRole('listitem').filter({ hasText: 'serendipity' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('happy accident')
})

test('[A3] the Study tab shows the word on the front and the definition after flipping', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await addWord(page, 'ephemeral', 'short-lived')
  await page.getByRole('tab', { name: 'Study' }).click()
  await expect(page.getByText('serendipity')).toBeVisible()
  await page.getByRole('button', { name: 'Flip' }).click()
  await expect(page.getByText('happy accident')).toBeVisible()
})

test('[A4] grading Again removes the card from the session queue and shows the due count', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await addWord(page, 'ephemeral', 'short-lived')
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Flip' }).click()
  await page.getByRole('button', { name: 'Again' }).click()
  await expect(page.getByText('1 card due')).toBeVisible()
  await expect(page.getByText('serendipity')).toHaveCount(0)
})

test('[A5] grading Good moves the card out of the current session', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await addWord(page, 'ephemeral', 'short-lived')
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Flip' }).click()
  await page.getByRole('button', { name: 'Good' }).click()
  await expect(page.getByText('1 card due')).toBeVisible()
  await expect(page.getByText('serendipity')).toHaveCount(0)
})

test('[A6] grading the whole session shows Session complete and the Review due button', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await addWord(page, 'ephemeral', 'short-lived')
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Flip' }).click()
  await page.getByRole('button', { name: 'Good' }).click()
  await page.getByRole('button', { name: 'Flip' }).click()
  await page.getByRole('button', { name: 'Again' }).click()
  await expect(page.getByText('Session complete')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review due' })).toBeVisible()
})

test('[A7] Delete ephemeral removes the matching list item', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await addWord(page, 'ephemeral', 'short-lived')
  await page.getByRole('button', { name: 'Delete ephemeral' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'ephemeral' })).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'serendipity' })).toBeVisible()
})

test('[A8] Export CSV copies a CSV containing the word line', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await addWord(page, 'ephemeral', 'short-lived')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'CSV contains the serendipity line').toContain('serendipity,happy accident')
})

test('[A9] the deck survives a reload', async ({ page }) => {
  await page.goto('/')
  await addWord(page, 'serendipity', 'happy accident')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'serendipity' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('happy accident')
})
