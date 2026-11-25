import { expect, test, type Page } from '@playwright/test'

const original = (page: Page) => page.getByLabel('Original', { exact: true })
const revised = (page: Page) => page.getByLabel('Revised', { exact: true })

test('[A1] heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Text Diff Checker' })).toBeVisible()
})

test('[A2] empty panes show a prompt', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Compare' }).click()
  await expect(page.getByText('Enter text in both panes to compare')).toBeVisible()
})

test('[A3] diff marks removed and added lines', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello\nWorld')
  await revised(page).fill('Hello\nEarth')
  await page.getByRole('button', { name: 'Compare' }).click()
  const removed = page.getByText('World')
  await expect(removed).toBeVisible()
  await expect(page.getByText('Earth')).toBeVisible()
  expect(await removed.getAttribute('data-change')).toContain('remove')
  expect(await page.getByText('Earth').getAttribute('data-change')).toContain('add')
})

test('[A4] case-insensitive match reports no differences', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello')
  await revised(page).fill('hello')
  await page.getByRole('button', { name: 'Compare' }).click()
  await expect(page.getByText('No differences found')).toBeVisible()
})

test('[A5] case-sensitive diff marks changed case', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello')
  await revised(page).fill('hello')
  await page.getByLabel('Case sensitive', { exact: true }).check()
  await page.getByRole('button', { name: 'Compare' }).click()
  const removed = page.getByText('Hello')
  await expect(removed).toBeVisible()
  await expect(page.getByText('hello')).toBeVisible()
  expect(await removed.getAttribute('data-change')).toContain('remove')
  expect(await page.getByText('hello').getAttribute('data-change')).toContain('add')
})

test('[A6] copy diff shows a toast', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello\nWorld')
  await revised(page).fill('Hello\nEarth')
  await page.getByRole('button', { name: 'Compare' }).click()
  await page.getByRole('button', { name: 'Copy diff' }).click()
  await expect(page.getByText('Diff copied to clipboard')).toBeVisible()
})

test('[A7] download diff saves diff.txt', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello\nWorld')
  await revised(page).fill('Hello\nEarth')
  await page.getByRole('button', { name: 'Compare' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download diff' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('diff.txt')
})

test('[A8] summary tab counts lines', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello\nWorld')
  await revised(page).fill('Hello\nEarth')
  await page.getByRole('button', { name: 'Compare' }).click()
  await page.getByRole('tab', { name: 'Summary' }).click()
  await expect(page.getByText('1 line removed, 1 line added')).toBeVisible()
})

test('[A9] last comparison survives a reload', async ({ page }) => {
  await page.goto('/')
  await original(page).fill('Hello\nWorld')
  await revised(page).fill('Hello\nEarth')
  await page.getByRole('button', { name: 'Compare' }).click()
  const before = await page.getByText('World').getAttribute('data-change')
  expect(before).toContain('remove')
  await page.reload()
  await expect(page.getByText('World')).toBeVisible()
  await expect(page.getByText('Earth')).toBeVisible()
  expect(await page.getByText('World').getAttribute('data-change')).toContain('remove')
  expect(await page.getByText('Earth').getAttribute('data-change')).toContain('add')
})
