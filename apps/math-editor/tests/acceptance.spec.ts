import { expect, test } from '@playwright/test'

test('[A1] shows the Math Editor heading and the Source tab is active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Math Editor' })).toBeVisible()
  const sourceTab = page.getByRole('tab', { name: 'Source' })
  await expect(sourceTab).toBeVisible()
  await expect(sourceTab).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByText('Type Markdown and TeX here')).toBeVisible()
})

test('[A2] renders a heading, prose and inline math in the Preview tab', async ({ page }) => {
  await page.goto('/')
  await page.locator('textarea, [contenteditable]').first().fill('# Title\n\nHello $x^2$ world')
  await page.waitForTimeout(500)
  await page.getByRole('tab', { name: 'Preview' }).click()
  const panel = page.getByRole('tabpanel', { name: 'Preview' }).first()
  await expect(panel.getByRole('heading', { name: 'Title', level: 1 })).toBeVisible()
  await expect(panel.getByText('Hello', { exact: false })).toBeVisible()
  await expect(panel.getByText('world', { exact: false })).toBeVisible()
  await expect(panel.getByRole('math', { name: 'x squared' })).toBeVisible()
})

test('[A3] renders a two-column two-row table in the Preview tab', async ({ page }) => {
  await page.goto('/')
  await page.locator('textarea, [contenteditable]').first().fill('| A | B |\n|---|---|\n| 1 | 2 |')
  await page.waitForTimeout(500)
  await page.getByRole('tab', { name: 'Preview' }).click()
  const panel = page.getByRole('tabpanel', { name: 'Preview' }).first()
  const table = panel.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('column')).toHaveCount(2)
  await expect(table.getByRole('row')).toHaveCount(2)
  const body = table.locator('tbody')
  await expect(body.locator('td').nth(0)).toHaveText('1')
  await expect(body.locator('td').nth(1)).toHaveText('2')
})

test('[A4] renders a task list with one unchecked and one checked item', async ({ page }) => {
  await page.goto('/')
  await page.locator('textarea, [contenteditable]').first().fill('- [ ] Task one\n- [x] Task two')
  await page.waitForTimeout(500)
  await page.getByRole('tab', { name: 'Preview' }).click()
  const panel = page.getByRole('tabpanel', { name: 'Preview' }).first()
  const items = panel.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items.nth(0).getByRole('checkbox', { name: /task one/i })).toBeUnchecked()
  await expect(items.nth(0)).toContainText('Task one')
  await expect(items.nth(1).getByRole('checkbox', { name: /task two/i })).toBeChecked()
  await expect(items.nth(1)).toContainText('Task two')
})

test('[A5] Copy Markdown copies the exact code area text to the clipboard', async ({ page, context }) => {
  // grant before the copy click so the clipboard write can succeed
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.locator('textarea, [contenteditable]').first().fill('# Hi\n\n$y$')
  await page.getByRole('button', { name: 'Copy Markdown' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('# Hi\n\n$y$')
})

test('[A6] Export HTML downloads math-editor.html containing the heading', async ({ page }) => {
  await page.goto('/')
  await page.locator('textarea, [contenteditable]').first().fill('# Hi')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export HTML' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('math-editor.html')
  const { readFileSync } = await import('node:fs')
  const body = readFileSync((await download.path())!, 'utf8')
  expect(body).toContain('<h1>Hi</h1>')
})

test('[A7] the History tab shows two snapshots after two autosaves', async ({ page }) => {
  await page.goto('/')
  const code = page.locator('textarea, [contenteditable]').first()
  await code.fill('# First')
  await page.waitForTimeout(2000)
  await code.fill('# Second')
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: 'History' }).click()
  const panel = page.getByRole('tabpanel', { name: 'History' }).first()
  await expect(panel.getByText('First')).toBeVisible()
  await expect(panel.getByText('Second')).toBeVisible()
})

test('[A8] Restore puts the snapshot back in the code area and the Preview tab', async ({ page }) => {
  await page.goto('/')
  const code = page.locator('textarea, [contenteditable]').first()
  await code.fill('# First')
  await page.waitForTimeout(2000)
  await code.fill('# Second')
  await page.waitForTimeout(2000)
  await page.getByRole('tab', { name: 'History' }).click()
  const panel = page.getByRole('tabpanel', { name: 'History' }).first()
  await panel.getByRole('button', { name: 'Restore' }).first().click()
  await expect(code).toHaveText('# First')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'First', level: 1 })).toBeVisible()
})

test('[A9] reloading keeps the autosaved document', async ({ page }) => {
  await page.goto('/')
  const code = page.locator('textarea, [contenteditable]').first()
  await code.fill('# Saved Doc')
  await page.waitForTimeout(2000)
  await page.reload()
  await expect(code).toHaveText('# Saved Doc')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Saved Doc', level: 1 })).toBeVisible()
})
