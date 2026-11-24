import { expect, test, type Page } from '@playwright/test'

async function addEntry(page: Page, name: string, username: string, password: string) {
  await page.getByRole('button', { name: 'New entry' }).click()
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Username').fill(username)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] the heading "Password Manager" is shown and "No entries yet" appears when empty', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Password Manager' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A2] saving a new entry adds a list item with its name and username and hides the empty text', async ({
  page,
}) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const item = page.getByRole('listitem').filter({ hasText: 'GitHub' })
  await expect(item).toContainText('octocat')
  await expect(page.getByText('No entries yet')).toHaveCount(0)
})

test('[A3] "Reveal" toggles the entry password between dots and the plaintext', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const item = page.getByRole('listitem').filter({ hasText: 'GitHub' })
  await expect(item.getByText('••••••••••')).toBeVisible()
  await item.getByRole('button', { name: 'Reveal' }).click()
  await expect(item.getByText('secret123')).toBeVisible()
  await item.getByRole('button', { name: 'Reveal' }).click()
  await expect(item.getByText('••••••••••')).toBeVisible()
})

test('[A4] "Generate" replaces the password with a new 12-character string containing all classes', async ({
  page,
}) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const item = page.getByRole('listitem').filter({ hasText: 'GitHub' })
  await item.getByRole('button', { name: 'Generate' }).click()
  const value = await item.getByLabel('Password').inputValue()
  expect(value.length).toBe(12)
  expect(value).not.toBe('secret123')
  expect(value).toMatch(/[A-Z]/)
  expect(value).toMatch(/[a-z]/)
  expect(value).toMatch(/[0-9]/)
  expect(value).toMatch(/[^A-Za-z0-9]/)
})

test('[A5] "Copy" puts the entry password on the clipboard and shows "Copied to clipboard"', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const item = page.getByRole('listitem').filter({ hasText: 'GitHub' })
  await item.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('secret123')
})

test('[A6] the search box filters the list and shows "No entries match" when nothing matches', async ({
  page,
}) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  await page.getByLabel('Search').fill('git')
  await expect(page.getByRole('listitem').filter({ hasText: 'GitHub' })).toBeVisible()
  await page.getByLabel('Search').fill('nonexistent')
  await expect(page.getByText('No entries match')).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'GitHub' })).toHaveCount(0)
})

test('[A7] "Delete" removes the entry and "No entries yet" is visible again', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  const item = page.getByRole('listitem').filter({ hasText: 'GitHub' })
  await item.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'GitHub' })).toHaveCount(0)
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A8] a saved entry survives a reload and its password is the original', async ({ page }) => {
  await page.goto('/')
  await addEntry(page, 'GitHub', 'octocat', 'secret123')
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'GitHub' })
  await expect(item).toContainText('octocat')
  await item.getByRole('button', { name: 'Reveal' }).click()
  await expect(item.getByText('secret123')).toBeVisible()
})

test('[A9] the form "Generate" with "Passphrase" type produces 4 hyphen-separated words', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New entry' }).click()
  await page.getByLabel('Type').selectOption({ label: 'Passphrase' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const value = await page.getByLabel('Password').inputValue()
  expect(value).toMatch(/^[a-z]+(?:-[a-z]+){3}$/)
})
