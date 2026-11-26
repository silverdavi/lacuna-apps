import { test, expect } from '@playwright/test'

test('[A1] shows heading and empty state with no notes', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Sticky Notes' })).toBeVisible()
  await expect(page.getByText('No notes yet')).toBeVisible()
})

test('[A2] adding a note from the form adds its item', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Note text').fill('Buy milk')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.getByText('Buy milk')).toBeVisible()
  await expect(page.getByText('No notes yet')).not.toBeVisible()
  await expect(page.locator('li', { hasText: 'Buy milk' })).toBeVisible()
})

test('[A3] deleting the last note removes its item and restores the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Note text').fill('Buy milk')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('button', { name: 'Delete Buy milk' }).click()
  await expect(page.locator('li', { hasText: 'Buy milk' })).not.toBeVisible()
  await expect(page.getByText('No notes yet')).toBeVisible()
})

test('[A4] searching filters the list to matching notes', async ({ page }) => {
  await page.goto('/')
  for (const text of ['Alpha', 'Beta']) {
    await page.getByLabel('Note text').fill(text)
    await page.getByRole('button', { name: 'Add note' }).click()
  }
  await page.getByLabel('Search').fill('Al')
  await expect(page.locator('li', { hasText: 'Alpha' })).toBeVisible()
  await expect(page.locator('li', { hasText: 'Beta' })).not.toBeVisible()
})

test('[A5] exporting copies a JSON string containing the note text', async ({ page }) => {
  await page.goto('/')
  for (const text of ['Alpha', 'Beta']) {
    await page.getByLabel('Note text').fill(text)
    await page.getByRole('button', { name: 'Add note' }).click()
  }
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const exported = await page.evaluate(() =>
    navigator.clipboard.readText().then((s) => s).catch(() => ''),
  )
  expect(exported, 'clipboard holds the exported JSON').toContain('Alpha')
})

test('[A6] editing a note updates its text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Note text').fill('Test')
  await page.getByRole('button', { name: 'Add note' }).click()
  await page.getByRole('button', { name: 'Edit Test' }).click()
  await expect(page.getByLabel('Note text')).toHaveValue('Test')
  await page.getByLabel('Note text').fill('Updated')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('li', { hasText: 'Updated' })).toBeVisible()
  await expect(page.locator('li', { hasText: 'Test' })).not.toBeVisible()
})

test('[A7] moving a note down reorders the list', async ({ page }) => {
  await page.goto('/')
  for (const text of ['First', 'Second']) {
    await page.getByLabel('Note text').fill(text)
    await page.getByRole('button', { name: 'Add note' }).click()
  }
  const moveDown = page.getByRole('button', { name: /Move down/ }).first()
  await moveDown.focus()
  await moveDown.press('ArrowDown')
  const items = page.locator('li')
  await expect(items.first()).toContainText('Second')
  await expect(items.nth(1)).toContainText('First')
})

test('[A8] notes persist across reloads', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Note text').fill('Persist me')
  await page.getByRole('button', { name: 'Add note' }).click()
  await expect(page.locator('li', { hasText: 'Persist me' })).toBeVisible()
  await page.reload()
  await expect(page.locator('li', { hasText: 'Persist me' })).toBeVisible()
})
