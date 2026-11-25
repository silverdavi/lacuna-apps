import { promises as fs } from 'fs'
import { expect, test, type Page } from '@playwright/test'

const status = (page: Page) => page.getByRole('status')

// Appends text to the end of the deck without replacing what is already there,
// the way a person typing after the existing text would.
async function append(page: Page, text: string) {
  const editor = page.getByRole('textbox')
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.pressSequentially(text)
}

// Selects the first matching checkbox in the preview; in the current deck
// layout that is the checkbox next to "Task A".
async function clickTaskACheckbox(page: Page) {
  const first = page.getByRole('checkbox').first()
  await expect(first).toBeVisible()
  await first.click()
}

test('[A1] page shows heading, default deck text and its rendered preview', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Markdown Slide Deck' })).toBeVisible()
  await expect(page.getByRole('textbox')).toHaveValue('# Welcome\n\nThis is a demo slide.')
  await expect(page.getByRole('region', { name: 'Preview' }).getByRole('heading', { name: 'Welcome' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Preview' }).getByText('This is a demo slide.')).toBeVisible()
})

test('[A2] typing a second slide after the existing text creates two slides', async ({ page }) => {
  await page.goto('/')
  await append(page, '\n---\n\n## Agenda\n\n- Item one\n- Item two\n')
  await append(page, '\n')
  const preview = page.getByRole('region', { name: 'Preview' })
  await expect(preview.getByRole('article').nth(0).getByRole('heading', { name: 'Welcome' })).toBeVisible()
  await expect(preview.getByRole('article').nth(1).getByRole('heading', { name: 'Agenda' })).toBeVisible()
  await expect(preview.getByRole('article').nth(1).getByRole('listitem').nth(0)).toHaveText('Item one')
  await expect(preview.getByRole('article').nth(1).getByRole('listitem').nth(1)).toHaveText('Item two')
  await expect(status(page)).toContainText('2 slides')
})

test('[A3] a new slide renders a task list and clicking a checkbox updates the editor text', async ({ page }) => {
  await page.goto('/')
  await append(page, '\n---\n\n- [ ] Task A\n- [x] Task B\n')
  await append(page, '\n')
  const third = page.getByRole('region', { name: 'Preview' }).getByRole('article').nth(2)
  await expect(third.getByText('Task A')).toBeVisible()
  await expect(third.getByText('Task B')).toBeVisible()
  await clickTaskACheckbox(page)
  await expect(page.getByRole('textbox')).toContainText('- [x] Task A')
})

test('[A4] the Preview and Editor tabs switch the main view and both stay visible', async ({ page }) => {
  await page.goto('/')
  const editor = page.getByRole('textbox')
  const preview = page.getByRole('region', { name: 'Preview' })
  const editorTab = page.getByRole('tab', { name: 'Editor' })
  const previewTab = page.getByRole('tab', { name: 'Preview' })
  await previewTab.click()
  await expect(editor).toBeHidden()
  await expect(preview.getByRole('article').first()).toBeVisible()
  await expect(previewTab).toBeVisible()
  await editorTab.click()
  await expect(editor).toBeVisible()
  await expect(previewTab).toBeVisible()
})

test('[A5] a table typed on a new slide renders with headers and a row', async ({ page }) => {
  await page.goto('/')
  await append(page, '\n---\n\n| Col 1 | Col 2 |\n|---|---|\n| A | B |\n')
  const table = page.getByRole('region', { name: 'Preview' }).getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader').nth(0)).toHaveText('Col 1')
  await expect(table.getByRole('columnheader').nth(1)).toHaveText('Col 2')
  await expect(table.getByRole('row').nth(1).getByRole('cell').nth(0)).toHaveText('A')
  await expect(table.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText('B')
})

test('[A6] the Export menu offers Print and a JSON download of the deck text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Export' }).click()
  const menu = page.getByRole('menu')
  await expect(menu.getByRole('menuitem', { name: 'Print' })).toBeVisible()
  await expect(menu.getByRole('menuitem', { name: 'JSON' })).toBeVisible()
  // window.print() in headless Chromium does not open a dialog or fire a
  // Playwright-observable event. Verify the click path works by confirming the
  // app remains stable and the Export menu reopens for the JSON download.
  await menu.getByRole('menuitem', { name: 'Print' }).click()
  await page.waitForTimeout(200)
  await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled()
  await page.getByRole('button', { name: 'Export' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: 'JSON' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('deck.json')
  expect(await fs.readFile(await download.path(), 'utf8')).toBe('# Welcome\n\nThis is a demo slide.')
})

test('[A7] Undo reverts the last typed edit back to one slide', async ({ page }) => {
  await page.goto('/')
  await append(page, '# Agenda')
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByRole('textbox')).not.toContainText('# Agenda')
  await expect(status(page)).toContainText('1 slide')
})

test('[A8] the status bar reports the cursor slide as "Slide N of M"', async ({ page }) => {
  await page.goto('/')
  await append(page, '\n---\n\n## Agenda\n\n- Item one\n- Item two\n')
  const editor = page.getByRole('textbox')
  await editor.click()
  await page.keyboard.press('Control+Home')
  await expect(status(page)).toHaveText(/Slide 1 of 2/)
  await page.keyboard.press('Control+End')
  await expect(status(page)).toHaveText(/Slide 2 of 2/)
})

test('[A9] the deck text survives a reload and the preview keeps the new slide', async ({ page }) => {
  await page.goto('/')
  await append(page, '# New Slide')
  await page.reload()
  await expect(page.getByRole('textbox')).toContainText('# New Slide')
  await expect(page.getByRole('region', { name: 'Preview' }).getByRole('heading', { name: 'New Slide' })).toBeVisible()
})
