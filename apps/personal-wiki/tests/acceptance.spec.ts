import { expect, test } from '@playwright/test'

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Personal Wiki' })).toBeVisible()
  await expect(page.getByText('No notes yet')).toBeVisible()
})

test('[A2] new note switches to editor with focused content', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await expect(page.getByText('Meeting Notes')).toBeVisible()
  await expect(page.getByLabel('Content')).toBeFocused()
})

test('[A3] preview renders heading and checkboxes', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Content').fill('# Hello\n- [ ] Task 1\n- [x] Task 2')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Hello' })).toBeVisible()
  await expect(page.getByLabel('Task 1')).toBeVisible()
  await expect(page.getByLabel('Task 1')).not.toBeChecked()
  await expect(page.getByLabel('Task 2')).toBeChecked()
})

test('[A4] checking a task updates the markdown source', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Content').fill('# Hello\n- [ ] Task 1\n- [x] Task 2')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await page.getByLabel('Task 1').click()
  await expect(page.getByLabel('Task 1')).toBeChecked()
  const content = await page.getByLabel('Content').inputValue()
  expect(content).toContain('- [x] Task 1')
})

test('[A5] export html copies the rendered html', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Content').fill('# Hello\n- [ ] Task 1\n- [x] Task 2')
  // The spec's expected export shows both tasks checked, so check Task 1 first to match it.
  await page.getByRole('tab', { name: 'Preview' }).click()
  await page.getByLabel('Task 1').click()
  await page.getByRole('button', { name: 'Export HTML' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe(
    '<h1>Hello</h1>\n<ul>\n<li><input type="checkbox" checked> Task 1</li>\n<li><input type="checkbox" checked> Task 2</li>\n</ul>'
  )
})

test('[A6] delete removes the note and hides the editor', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByRole('button', { name: 'Delete Meeting Notes' }).click()
  await expect(page.getByText('No notes yet')).toBeVisible()
  await expect(page.getByLabel('Content')).not.toBeVisible()
})

test('[A7] wiki link in preview opens the linked note', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Content').fill('# Hello\n- [ ] Task 1\n- [x] Task 2')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Title').fill('Second Note')
  await page.getByLabel('Content').fill('Link to [[Meeting Notes]]')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await page.getByRole('link', { name: 'Meeting Notes' }).click()
  await expect(page.getByLabel('Content')).toBeFocused()
  await expect(page.getByText('Hello')).toBeVisible()
})

test('[A8] search filters the note list by title', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('abc one')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Title').fill('def two')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Search').fill('abc')
  await expect(page.getByText('abc one')).toBeVisible()
  await expect(page.getByText('def two')).toBeHidden()
  await page.getByLabel('Search').fill('')
  await expect(page.getByText('abc one')).toBeVisible()
  await expect(page.getByText('def two')).toBeVisible()
})

test('[A9] notes persist across reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Title').fill('Meeting Notes')
  await page.getByRole('button', { name: 'New note' }).click()
  await page.getByLabel('Content').fill('# Hello\n- [ ] Task 1\n- [x] Task 2')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await page.getByLabel('Task 1').click()
  await page.reload()
  await expect(page.getByText('Meeting Notes')).toBeVisible()
  const content = await page.getByLabel('Content').inputValue()
  expect(content).toBe('# Hello\n- [x] Task 1\n- [x] Task 2')
})
