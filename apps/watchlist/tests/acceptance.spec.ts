// Acceptance tests for the watchlist app, one per spec check A1-A9.
// The spec lives in builds/lacuna-apps/watchlist.spec.md; do not edit tests to match an impl.
import { expect, test, type Page } from '@playwright/test'

const addMovie = async (page: Page, title: string, type: string, year: string, rating?: string) => {
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Year').fill(year)
  await page.getByLabel('Type').selectOption(type)
  if (rating !== undefined) await page.getByLabel('Rating').fill(rating)
  await page.getByRole('button', { name: 'Add' }).click()
}

test('[A1] heading reads Movie Watchlist', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Movie Watchlist' })).toBeVisible()
})

test('[A2] empty table shows No movies yet', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No movies yet')).toBeVisible()
})

test('[A3] adding Inception adds a row and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010')
  const row = page.getByRole('row', { name: /Inception/ })
  await expect(row.getByText('Inception')).toBeVisible()
  await expect(row.getByText('2010')).toBeVisible()
  await expect(page.getByText('No movies yet')).toHaveCount(0)
})

test('[A4] Delete Inception removes the row and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010')
  await expect(page.getByText('No movies yet')).toHaveCount(0)
  await page.getByRole('button', { name: 'Delete Inception' }).click()
  await expect(page.getByText('No movies yet')).toBeVisible()
})

test('[A5] search narrows to the matching title', async ({ page }) => {
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010')
  await addMovie(page, 'Breaking Bad', 'Show', '2008')
  await page.getByLabel('Search').fill('inception')
  const inception = page.getByRole('row', { name: /Inception/ })
  await expect(inception.getByText('Inception')).toBeVisible()
  const breakingBad = page.getByRole('row', { name: /Breaking Bad/ })
  await expect(breakingBad).toHaveCount(0)
})

test('[A6] type filter shows only matching type', async ({ page }) => {
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010')
  await addMovie(page, 'Breaking Bad', 'Show', '2008')
  await page.getByLabel('Filter by type').selectOption('Show')
  const breakingBad = page.getByRole('row', { name: /Breaking Bad/ })
  await expect(breakingBad.getByText('Breaking Bad')).toBeVisible()
  const inception = page.getByRole('row', { name: /Inception/ })
  await expect(inception).toHaveCount(0)
})

test('[A7] Export CSV copies the expected CSV to the clipboard', async ({ page }) => {
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://127.0.0.1' })
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010', '8.8')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip.startsWith('Title,Type,Year,Rating')).toBe(true)
  expect(clip).toContain('Inception,Movie,2010,8.8')
})

test('[A8] Mark watched flips the status to Watched', async ({ page }) => {
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010')
  const row = page.getByRole('row', { name: /Inception/ })
  await expect(row.getByText('Unwatched')).toBeVisible()
  await row.getByRole('button', { name: 'Mark watched' }).click()
  await expect(row.getByText('Watched')).toBeVisible()
  await expect(row.getByText('Unwatched')).toHaveCount(0)
})

test('[A9] record survives a reload', async ({ page }) => {
  await page.goto('/')
  await addMovie(page, 'Inception', 'Movie', '2010')
  await page.reload()
  const row = page.getByRole('row', { name: /Inception/ })
  await expect(row.getByText('Inception')).toBeVisible()
  await expect(row.getByText('2010')).toBeVisible()
})
