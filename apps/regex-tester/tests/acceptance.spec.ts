import { expect, test } from '@playwright/test'

async function setPatternAndText(page: import('@playwright/test').Page, pattern: string, text: string) {
  await page.getByLabel('Pattern').fill(pattern)
  await page.getByLabel('Sample text').fill(text)
}

test('[A1] page shows heading and tab labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Regex Tester' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Test' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'History' })).toBeVisible()
})

test('[A2] matching pattern shows match list and count', async ({ page }) => {
  await page.goto('/')
  await setPatternAndText(page, 'hello', 'hello world')
  await expect(page.getByText('hello')).toBeVisible()
  await expect(page.getByText('Matches: 1')).toBeVisible()
})

test('[A3] pattern with capture groups shows each match and the count', async ({ page }) => {
  await page.goto('/')
  await setPatternAndText(page, '(\\d+)', 'a1 b22 c333')
  await expect(page.getByText('1', { exact: true })).toBeVisible()
  await expect(page.getByText('22', { exact: true })).toBeVisible()
  await expect(page.getByText('333', { exact: true })).toBeVisible()
  await expect(page.getByText('Matches: 3')).toBeVisible()
})

test('[A4] match items show their capture group', async ({ page }) => {
  await page.goto('/')
  await setPatternAndText(page, '(\\d+)', 'a1 b22 c333')
  await expect(page.getByText('Group 1: 22')).toBeVisible()
})

test('[A5] copy result copies matches to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await setPatternAndText(page, '(\\d+)', 'a1 b22 c333')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('1\n22\n333')
})

test('[A6] save pattern adds a row to the history tab', async ({ page }) => {
  await page.goto('/')
  await setPatternAndText(page, '(\\d+)', 'a1 b22 c333')
  await page.getByRole('button', { name: 'Save pattern' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('(\\d+)', { exact: true })).toBeVisible()
  await expect(page.getByText('3')).toBeVisible()
})

test('[A7] delete a saved pattern removes it and shows empty state', async ({ page }) => {
  await page.goto('/')
  await setPatternAndText(page, '(\\d+)', 'a1 b22 c333')
  await page.getByRole('button', { name: 'Save pattern' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Delete (\\d+)' }).click()
  await expect(page.getByText('(\\d+)', { exact: true })).toHaveCount(0)
  await expect(page.getByText('No saved patterns')).toBeVisible()
})

test('[A8] case insensitive matching still matches when case differs', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Pattern').fill('(\\d+)')
  await page.getByLabel('Case insensitive').check()
  await page.getByLabel('Sample text').fill('A1 B22 C333')
  await expect(page.getByText('Matches: 3')).toBeVisible()
})

test('[A9] current pattern and saved patterns persist across a reload', async ({ page }) => {
  await page.goto('/')
  await setPatternAndText(page, '(\\d+)', 'a1 b22 c333')
  await page.getByRole('button', { name: 'Save pattern' }).click()
  await page.reload()
  await expect(page.getByLabel('Pattern')).toHaveValue('(\\d+)')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('(\\d+)', { exact: true })).toBeVisible()
})
