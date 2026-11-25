import { expect, test, type Page } from '@playwright/test'

async function addTask(page: Page, name: string) {
  await page.getByLabel('Task').fill(name)
  await page.getByRole('button', { name: 'Add task' }).click()
}

async function tickTask(page: Page, name: string) {
  await page.getByRole('checkbox', { name }).click()
}

test('[A1] page shows heading "Checklist App"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Checklist App' })).toBeVisible()
})

test('[A2] adding a task creates a list item and shows 0 of 1 done', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await expect(page.getByText('0 of 1 done')).toBeVisible()
})

test('[A3] ticking a task updates progress to 1 of 1 done', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await tickTask(page, 'Buy milk')
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})

test('[A4] adding a second task adds it unchecked and shows 1 of 2 done', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await tickTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await expect(page.getByRole('listitem').filter({ hasText: 'Walk dog' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Walk dog' })).not.toBeChecked()
  await expect(page.getByText('1 of 2 done')).toBeVisible()
})

test('[A5] deleting a task removes it and updates progress', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await tickTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await page.getByRole('button', { name: 'Delete Walk dog' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Walk dog' })).toHaveCount(0)
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})

test('[A6] Copy as Markdown puts exact markdown on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  await tickTask(page, 'Walk dog')
  await page.getByRole('button', { name: 'Copy as Markdown' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('- [ ] Buy milk\n- [x] Walk dog')
})

test('[A7] History tab shows empty state then lists actions after ticking', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('No history yet')).toBeVisible()
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await tickTask(page, 'Buy milk')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('No history yet')).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
})

test('[A8] pressing ArrowDown on Reorder moves task below the next one', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await addTask(page, 'Walk dog')
  const reorder = page.getByRole('button', { name: 'Reorder Buy milk' })
  await reorder.focus()
  await page.keyboard.press('ArrowDown')
  const items = page.getByRole('listitem')
  await expect(items.nth(0)).toContainText('Walk dog')
})

test('[A9] ticked task persists after reload', async ({ page }) => {
  await page.goto('/')
  await addTask(page, 'Buy milk')
  await tickTask(page, 'Buy milk')
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})
