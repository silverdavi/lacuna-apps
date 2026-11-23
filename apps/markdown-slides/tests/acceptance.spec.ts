import { expect, test } from '@playwright/test'

test.describe('markdown-slides acceptance', () => {
  const DEFAULT_DECK = '# Welcome\n\nThis is a demo slide.'

  test('[A1] initial state shows heading, default editor text, and rendered preview', async ({
    page,
  }) => {
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'Markdown Slide Deck' })).toBeVisible()

    const editor = page.getByRole('textbox')
    await expect(editor).toHaveText(DEFAULT_DECK)

    await expect(page.getByRole('heading', { name: 'Welcome', level: 1 })).toBeVisible()
    await expect(page.getByText('This is a demo slide.')).toBeVisible()
  })

  test('[A2] typing after the existing text and pressing Enter creates a second slide', async ({
    page,
  }) => {
    await page.goto('/')

    const editor = page.getByRole('textbox')
    await editor.focus()
    await page.keyboard.press('Control+End')

    await page.keyboard.type('## Agenda\n\n- Item one\n- Item two')
    await page.keyboard.press('Enter')

    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
    await expect(page.getByText('Item one')).toBeVisible()
    await expect(page.getByText('Item two')).toBeVisible()

    await expect(page.getByText('2 slides')).toBeVisible()
  })

  test('[A3] adding a task-list slide renders checkboxes and clicking one updates the editor', async ({
    page,
  }) => {
    await page.goto('/')

    const editor = page.getByRole('textbox')
    await editor.focus()
    await page.keyboard.press('Control+End')

    await page.keyboard.type('\n---\n\n- [ ] Task A\n- [x] Task B')

    const taskA = page.getByRole('checkbox', { name: 'Task A' })
    const taskB = page.getByRole('checkbox', { name: 'Task B' })
    await expect(taskA).toBeVisible()
    await expect(taskB).toBeVisible()
    await expect(taskA).not.toBeChecked()
    await expect(taskB).toBeChecked()

    await taskA.click()
    await expect(editor).toContainText('- [x] Task A')
  })

  test('[A4] the Preview and Editor tabs switch the main view and stay visible and clickable', async ({
    page,
  }) => {
    await page.goto('/')

    const previewTab = page.getByRole('tab', { name: 'Preview' })
    const editorTab = page.getByRole('tab', { name: 'Editor' })
    await expect(previewTab).toBeVisible()
    await expect(editorTab).toBeVisible()

    await previewTab.click()
    await expect(page.getByRole('textbox')).not.toBeVisible()
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()

    await editorTab.click()
    await expect(page.getByRole('textbox')).toBeVisible()

    await expect(previewTab).toBeVisible()
    await previewTab.click()
    await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible()
  })

  test('[A5] a markdown table renders headers and a row', async ({ page }) => {
    await page.goto('/')

    const editor = page.getByRole('textbox')
    await editor.focus()
    await page.keyboard.press('Control+End')

    await page.keyboard.type('\n---\n\n| Col 1 | Col 2 |\n|---|---|\n| A | B |')

    await expect(page.getByRole('columnheader', { name: 'Col 1' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Col 2' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'A' })).toBeVisible()
    await expect(page.getByRole('cell', { name: 'B' })).toBeVisible()
  })

  test('[A6] Export offers Print and JSON; JSON downloads deck.json with the raw markdown', async ({
    page,
  }) => {
    await page.goto('/')

    const exportButton = page.getByRole('button', { name: 'Export' })

    // Print opens the browser's print dialog; headless Chromium has no native
    // dialog, so we verify the menu item is present and clickable instead of
    // asserting on the dialog itself.
    await exportButton.click()
    const printOption = page.getByRole('menuitem', { name: 'Print' })
    await expect(printOption).toBeVisible()
    await printOption.click()

    await exportButton.click()
    const jsonOption = page.getByRole('menuitem', { name: 'JSON' })
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      jsonOption.click(),
    ])
    await expect(download.suggestedFilename()).toBe('deck.json')

    const fs = await import('node:fs')
    const content = fs.readFileSync(await download.path(), 'utf8')
    await expect(content).toBe(DEFAULT_DECK)
  })

  test('[A7] Undo reverts the last edit', async ({ page }) => {
    await page.goto('/')

    const editor = page.getByRole('textbox')
    await editor.focus()
    await page.keyboard.press('Control+End')

    await page.keyboard.type('\n---\n\n# Agenda')
    await expect(page.getByText('2 slides')).toBeVisible()

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(editor).not.toContainText('# Agenda')
    await expect(page.getByText('1 slide')).toBeVisible()
  })

  test('[A8] status bar shows the current slide number and total for the cursor position', async ({
    page,
  }) => {
    await page.goto('/')

    const editor = page.getByRole('textbox')
    await editor.focus()
    await page.keyboard.press('Control+End')

    await page.keyboard.type('\n---\n\n# Agenda')

    await page.keyboard.press('Control+Home')
    await expect(page.getByText('Slide 1 of 2')).toBeVisible()

    await page.keyboard.press('Control+End')
    await expect(page.getByText('Slide 2 of 2')).toBeVisible()
  })

  test('[A9] the deck text survives a page reload', async ({ page }) => {
    await page.goto('/')

    const editor = page.getByRole('textbox')
    await editor.focus()
    await page.keyboard.press('Control+End')

    await page.keyboard.type('\n---\n\n# New Slide')
    await page.waitForTimeout(200)

    await page.reload()
    await expect(editor).toContainText('# New Slide')
    await expect(page.getByRole('heading', { name: 'New Slide' })).toBeVisible()
  })
})
