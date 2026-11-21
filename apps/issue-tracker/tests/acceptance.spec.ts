import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function addIssue(page: Page, title: string, type: string, priority: string, assignee: string) {
  await page.getByRole('button', { name: 'New issue' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Type').selectOption(type)
  await page.getByLabel('Priority').selectOption(priority)
  await page.getByLabel('Assignee').fill(assignee)
  await page.getByRole('button', { name: 'Save' }).click()
}

function row(page: Page, title: string) {
  return page.locator('tr').filter({ hasText: title })
}

function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) => [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows heading, no-issues text and New issue button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Bug Issue Tracker' })).toBeVisible()
  await expect(page.getByText('No issues yet')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New issue' })).toBeVisible()
})

test('[A2] adding an issue shows a row with all fields and status Open', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  const r = row(page, 'Login crash')
  await expect(r).toContainText('Bug')
  await expect(r).toContainText('High')
  await expect(r).toContainText('Alice')
  await expect(r).toContainText('Open')
})

test('[A3] clicking the Priority header sorts rows by priority', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  await addIssue(page, 'Dark mode', 'Feature', 'Low', 'Bob')
  await page.getByRole('columnheader', { name: 'Priority' }).click()
  expect(await orderBefore(page, 'Dark mode', 'Login crash')).toBe(true)
})

test('[A4] typing in the Search input filters the table', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  await addIssue(page, 'Dark mode', 'Feature', 'Low', 'Bob')
  await page.getByLabel('Search').fill('crash')
  await expect(row(page, 'Login crash')).toBeVisible()
  await expect(row(page, 'Dark mode')).toHaveCount(0)
})

// A5: "filter chip" may be a button or another role, so accept either; a bare
// getByText('Bug') would also match the Type cell inside the table row.
test('[A5] the Bug filter chip toggles a type filter', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  await addIssue(page, 'Dark mode', 'Feature', 'Low', 'Bob')
  const chip = page
    .getByRole('button', { name: 'Bug' })
    .or(page.getByText('Bug', { exact: true }))
    .filter({ hasNot: page.locator('tr') })
    .first()
  await chip.click()
  await expect(row(page, 'Login crash')).toBeVisible()
  await expect(row(page, 'Dark mode')).toHaveCount(0)
  await chip.click()
  await expect(row(page, 'Login crash')).toBeVisible()
  await expect(row(page, 'Dark mode')).toBeVisible()
})

test('[A6] editing an issue pre-fills the form and saves the change', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  await page.getByRole('button', { name: 'Edit' }).click()
  await expect(page.getByLabel('Title')).toHaveValue('Login crash')
  await page.getByLabel('Status').selectOption('In Progress')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Login crash')).toContainText('In Progress')
})

// A7: the spec says "the button" Delete without scoping it to a row, so click the
// page-level Delete; it acts on the selected/last row ("Dark mode").
test('[A7] deleting an issue removes its row', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  await addIssue(page, 'Dark mode', 'Feature', 'Low', 'Bob')
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(row(page, 'Dark mode')).toHaveCount(0)
  await expect(row(page, 'Login crash')).toBeVisible()
  await expect(page.getByText('No issues yet')).toHaveCount(0)
})

test('[A8] Export CSV downloads the table as CSV', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const lines = readFileSync((await download.path())!, 'utf8').split('\n')
  expect(lines[0]).toBe('Title,Type,Priority,Assignee,Status')
  expect(lines[1]).toBe('Login crash,Bug,High,Alice,Open')
})

test('[A9] an edited issue survives a reload', async ({ page }) => {
  await page.goto('/')
  await addIssue(page, 'Login crash', 'Bug', 'High', 'Alice')
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Status').selectOption('In Progress')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(row(page, 'Login crash')).toContainText('In Progress')
  await page.reload()
  await expect(row(page, 'Login crash')).toContainText('In Progress')
})
