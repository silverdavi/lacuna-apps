import { test, expect } from '@playwright/test'

// A5: "Copied 5 anagrams to clipboard" — the count matches the full anagram
// set for a 5-letter word with the original included, consistent with A3 and A9.

test('[A1] The page heading is "Anagram Solver"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Anagram Solver' })).toBeVisible()
})

test('[A2] Finding anagrams for "listen" shows the expected results', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  for (const item of ['silent', 'enlist', 'inlets', 'tinsel', 'listen']) {
    await expect(page.getByText(item, { exact: true })).toBeVisible()
  }
})

test('[A3] Include original: "listen" appears first, then the others in order', async ({ page }) => {
  await page.goto('/')
  const includeOriginal = page.getByRole('checkbox', { name: 'Include original' })
  if (!(await includeOriginal.isChecked())) await includeOriginal.check()
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  const items = page.getByRole('list').getByRole('listitem')
  await expect(items).toHaveCount(5)
  await expect(items.nth(0)).toContainText('listen')
  await expect(items.nth(1)).toContainText('silent')
  await expect(items.nth(2)).toContainText('enlist')
  await expect(items.nth(3)).toContainText('inlets')
  await expect(items.nth(4)).toContainText('tinsel')
})

test('[A4] Without Include original, "listen" is not in the results', async ({ page }) => {
  await page.goto('/')
  const includeOriginal = page.getByRole('checkbox', { name: 'Include original' })
  if (await includeOriginal.isChecked()) await includeOriginal.uncheck()
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  // The input still contains "listen", so scope the absence check to the results.
  await expect(page.getByRole('list').getByRole('listitem').filter({ hasText: 'listen' })).toHaveCount(0)
  for (const item of ['silent', 'enlist', 'inlets', 'tinsel']) {
    await expect(page.getByText(item, { exact: true })).toBeVisible()
  }
})

test('[A5] Copy results shows a toast with the exact count', async ({ page }) => {
  await page.goto('/')
  const includeOriginal = page.getByRole('checkbox', { name: 'Include original' })
  if (!(await includeOriginal.isChecked())) await includeOriginal.check()
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()
  await page.getByRole('button', { name: 'Copy results' }).click()

  await expect(page.getByText('Copied 5 anagrams to clipboard')).toBeVisible()
})

test('[A6] Adding "silent" to favorites shows it on the Favorites tab', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  const results = page.getByRole('list')
  await results.getByRole('listitem', { name: 'silent' }).getByRole('button', { name: 'Add to favorites' }).click()

  await page.getByRole('tab', { name: 'Favorites' }).click()
  await expect(page.getByRole('table').getByRole('row').filter({ hasText: 'silent' })).toBeVisible()
})

test('[A7] Removing a favorite shows "No favorites yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  const results = page.getByRole('list')
  await results.getByRole('listitem', { name: 'silent' }).getByRole('button', { name: 'Add to favorites' }).click()

  const favorites = page.getByRole('table')
  await page.getByRole('tab', { name: 'Favorites' }).click()
  await favorites.getByRole('row').filter({ hasText: 'silent' }).getByRole('button', { name: 'Remove' }).click()

  // The "silent" row is gone and the empty state replaces the table contents.
  await expect(favorites.getByRole('row').filter({ hasText: 'silent' })).toHaveCount(0)
  await expect(page.getByText('No favorites yet')).toBeVisible()
})

test('[A8] Finding anagrams for "aab" shows only "aba"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Word or phrase').fill('aab')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  await expect(page.getByRole('list').getByRole('listitem', { name: 'aba' })).toBeVisible()
  await expect(page.getByRole('list').getByRole('listitem')).toHaveCount(1)
})

test('[A9] Favorites persist across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Word or phrase').fill('listen')
  await page.getByRole('button', { name: 'Find anagrams' }).click()

  const results = page.getByRole('list')
  await results.getByRole('listitem', { name: 'silent' }).getByRole('button', { name: 'Add to favorites' }).click()

  await page.reload()
  await page.getByRole('tab', { name: 'Favorites' }).click()
  await expect(page.getByRole('table').getByRole('row').filter({ hasText: 'silent' })).toBeVisible()
})
