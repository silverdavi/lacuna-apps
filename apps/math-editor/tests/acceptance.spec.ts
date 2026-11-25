import { expect, test } from '@playwright/test'

test('[A1] page heading is "Math Editor" and the Source tab shows the code area with its placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Math Editor' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Source' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('textbox', { name: 'Source' })).toHaveAttribute('placeholder', 'Type Markdown and TeX here')
})

test('[A2] heading and inline math render in the preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('# Title\n\nHello $x^2$ world')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Title' })).toBeVisible()
  const panel = page.getByRole('tabpanel')
  await expect(panel.getByRole('math', { name: 'x squared' })).toBeVisible()
  await expect(panel.getByText('Hello')).toBeVisible()
  await expect(panel.getByText('world')).toBeVisible()
})

test('[A3] a markdown table renders as a real table', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('| A | B |\n|---|---|\n| 1 | 2 |')
  await page.getByRole('tab', { name: 'Preview' }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'A' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'B' })).toBeVisible()
  await expect(page.getByRole('columnheader')).toHaveCount(2)
  await expect(table.getByRole('row')).toHaveCount(2)
  await expect(table.getByRole('cell')).toHaveCount(2)
  await expect(table.getByRole('cell', { name: '1' })).toBeVisible()
  await expect(table.getByRole('cell', { name: '2' })).toBeVisible()
})

test('[A4] task list items render checkboxes with the task text as their name', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('- [ ] Task one\n- [x] Task two')
  await page.getByRole('tab', { name: 'Preview' }).click()
  const list = page.getByRole('list')
  await expect(list.getByRole('listitem')).toHaveCount(2)
  await expect(list.getByRole('checkbox', { name: 'Task one' })).not.toBeChecked()
  await expect(list.getByRole('checkbox', { name: 'Task two' })).toBeChecked()
})

test('[A5] Copy Markdown puts the source text on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('# Hi\n\n$y$')
  await page.getByRole('button', { name: 'Copy Markdown' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('# Hi\n\n$y$')
})

test('[A6] Export HTML downloads math-editor.html containing the rendered heading', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('# Hi')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export HTML' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('math-editor.html')
  const content = await download.text()
  expect(content).toContain('<h1>Hi</h1>')
})

test('[A7] each autosave adds a snapshot to the History tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('# First')
  await page.getByRole('tab', { name: 'History' }).click()
  const first = page.getByRole('listitem', { hasText: 'First' })
  await expect(first, 'first autosave lands in history').toBeVisible({ timeout: 10000 })
  await page.getByRole('tab', { name: 'Source' }).click()
  await page.getByRole('textbox', { name: 'Source' }).fill('# Second')
  const second = page.getByRole('listitem', { hasText: 'Second' })
  await expect(second, 'second autosave lands in history').toBeVisible({ timeout: 10000 })
})

test('[A8] restoring a history entry sets the source and the preview updates', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('# First')
  await page.getByRole('tab', { name: 'History' }).click()
  const first = page.getByRole('listitem', { hasText: 'First' })
  await expect(first, 'first autosave lands in history').toBeVisible({ timeout: 10000 })
  await page.getByRole('tab', { name: 'Source' }).click()
  await page.getByRole('textbox', { name: 'Source' }).fill('# Second')
  const second = page.getByRole('listitem', { hasText: 'Second' })
  await expect(second, 'second autosave lands in history').toBeVisible({ timeout: 10000 })
  await page.getByRole('tab', { name: 'History' }).click()
  await first.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('textbox', { name: 'Source' })).toHaveValue('# First')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'First' })).toBeVisible()
})

test('[A9] the document persists across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox', { name: 'Source' }).fill('# Saved Doc')
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('listitem', { hasText: 'Saved Doc' }), 'autosave lands in history').toBeVisible({ timeout: 10000 })
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Source' })).toHaveValue('# Saved Doc')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByRole('heading', { name: 'Saved Doc' })).toBeVisible()
})
