import { expect, test, type Page } from '@playwright/test'

// Each test gets a fresh browser profile, so a fresh localStorage.
async function open(page: Page) {
  await page.goto('/')
}

test('[A1] shows the heading "Regex Tester" and the tab labels "Test" and "History"', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('heading', { name: 'Regex Tester' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Test' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'History' })).toBeVisible()
})

test('[A2] pattern "hello" against "hello world" shows a match list containing "hello" and "Matches: 1"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('hello')
  await page.getByLabel('Sample text').fill('hello world')
  await expect(page.getByText('hello')).toBeVisible()
  await expect(page.getByText('Matches: 1')).toBeVisible()
})

test('[A3] pattern "(\\d+)" against "a1 b22 c333" shows three items "1", "22", "333" and "Matches: 3"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await expect(page.getByText('Matches: 3')).toBeVisible()
  await expect(page.getByText('1')).toBeVisible()
  await expect(page.getByText('22')).toBeVisible()
  await expect(page.getByText('333')).toBeVisible()
})

test('[A4] the match list item for "22" shows "Group 1: 22"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await expect(page.getByText('Group 1: 22')).toBeVisible()
})

test('[A5] clicking "Copy result" copies "1\\n22\\n333" to the clipboard and shows "Copied"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('1\n22\n333')
})

test('[A6] clicking "Save pattern" adds a History row containing "(\\d+)" and "3"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await page.getByRole('button', { name: 'Save pattern' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('(\\d+)')).toBeVisible()
  await expect(page.getByText('3')).toBeVisible()
})

test('[A7] clicking "Delete (\\d+)" removes the row and the History tab shows "No saved patterns"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await page.getByRole('button', { name: 'Save pattern' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Delete (\\d+)' }).click()
  await expect(page.getByText('No saved patterns')).toBeVisible()
})

test('[A8] with "Case insensitive" checked, "A1 B22 C333" still shows "Matches: 3"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await page.getByLabel('Case insensitive').check()
  await page.getByLabel('Sample text').fill('A1 B22 C333')
  await expect(page.getByText('Matches: 3')).toBeVisible()
})

test('[A9] reload keeps the saved pattern "(\\d+)" in History and the Pattern field value "(\\d+)"', async ({ page }) => {
  await open(page)
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Sample text').fill('a1 b22 c333')
  await page.getByRole('button', { name: 'Save pattern' }).click()
  await page.reload()
  await expect(page.getByLabel('Pattern')).toHaveValue('(\\d+)')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('(\\d+)')).toBeVisible()
})
