import { expect, test, type Page } from '@playwright/test'

async function addEntry(page: Page, name: string, username: string, password: string) {
  await page.getByRole('button', { name: 'New entry' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Save' }).click()
}

const DOTS = '••••••••••'

test('[A1] shows the heading and the empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Password Manager' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A2] saving a new entry adds it to the list', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  await expect(page.getByText('GitHub')).toBeVisible()
  await expect(page.getByText('octocat')).toBeVisible()
  await expect(page.getByText('No entries yet')).toHaveCount(0)
})

test('[A3] Reveal toggles the entry password between dots and the plaintext', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const row = page.locator('li').filter({ hasText: 'GitHub' })
  const reveal = row.getByRole('button', { name: 'Reveal' })
  await expect(row.getByText(DOTS, { exact: true })).toBeVisible()
  await reveal.click()
  await expect(row.getByText('secret123', { exact: true })).toBeVisible()
  await reveal.click()
  await expect(row.getByText(DOTS, { exact: true })).toBeVisible()
})

test('[A4] Generate replaces the password with a new 12-character password', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const row = page.locator('li').filter({ hasText: 'GitHub' })
  await row.getByRole('button', { name: 'Generate' }).click()
  await row.getByRole('button', { name: 'Reveal' }).click()
  const value = await row.locator('input, [role="textbox"]').first().inputValue()
  expect(value).not.toBe('secret123')
  expect(value.length).toBe(12)
  expect(value).toMatch(/[A-Z]/)
  expect(value).toMatch(/[a-z]/)
  expect(value).toMatch(/[0-9]/)
  expect(value).toMatch(/[^A-Za-z0-9]/)
})

test('[A5] Copy copies the password to the clipboard and shows a toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const row = page.locator('li').filter({ hasText: 'GitHub' })
  await row.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('secret123')
})

test('[A6] the search box filters the list', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  await addEntry(page, 'Gmail', 'octo', 'otherpass')
  await page.getByLabel('Search').fill('git')
  await expect(page.locator('li').filter({ hasText: 'GitHub' })).toBeVisible()
  await expect(page.locator('li').filter({ hasText: 'Gmail' })).toHaveCount(0)
  await page.getByLabel('Search').fill('nonexistent')
  await expect(page.getByText('No entries match')).toBeVisible()
})

test('[A7] Delete removes the entry and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const row = page.locator('li').filter({ hasText: 'GitHub' })
  await row.getByRole('button', { name: 'Delete' }).click()
  await expect(row).toHaveCount(0)
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A8] an entry survives a reload and its password is still revealed', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  await page.reload()
  const row = page.locator('li').filter({ hasText: 'GitHub' })
  await expect(row).toContainText('octocat')
  await row.getByRole('button', { name: 'Reveal' }).click()
  await expect(row.getByText('secret123', { exact: true })).toBeVisible()
})

test('[A9] Passphrase type generates 4 hyphen-separated words', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New entry' }).click()
  await page.getByLabel('Type').selectOption('Passphrase')
  await page.getByRole('button', { name: 'Generate' }).click()
  const value = await page.getByLabel('Password').inputValue()
  expect(value).not.toBe('')
  const words = value.split('-')
  expect(words).toHaveLength(4)
  for (const w of words) expect(w).toMatch(/^[a-z]+$/)
})
