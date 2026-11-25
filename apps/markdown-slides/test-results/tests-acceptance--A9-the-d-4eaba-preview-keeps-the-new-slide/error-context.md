# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/acceptance.spec.ts >> [A9] the deck text survives a reload and the preview keeps the new slide
- Location: tests/acceptance.spec.ts:120:1

# Error details

```
Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
Call log:
  - navigating to "/", waiting until "load"

```

# Test source

```ts
  21  | }
  22  | 
  23  | test('[A1] page shows heading, default deck text and its rendered preview', async ({ page }) => {
  24  |   await page.goto('/')
  25  |   await expect(page.getByRole('heading', { name: 'Markdown Slide Deck' })).toBeVisible()
  26  |   await expect(page.getByRole('textbox')).toHaveValue('# Welcome\n\nThis is a demo slide.')
  27  |   await expect(page.getByRole('region', { name: 'Preview' }).getByRole('heading', { name: 'Welcome' })).toBeVisible()
  28  |   await expect(page.getByRole('region', { name: 'Preview' }).getByText('This is a demo slide.')).toBeVisible()
  29  | })
  30  | 
  31  | test('[A2] typing a second slide after the existing text creates two slides', async ({ page }) => {
  32  |   await page.goto('/')
  33  |   await append(page, '\n---\n\n## Agenda\n\n- Item one\n- Item two\n')
  34  |   await append(page, '\n')
  35  |   const preview = page.getByRole('region', { name: 'Preview' })
  36  |   await expect(preview.getByRole('article').nth(0).getByRole('heading', { name: 'Welcome' })).toBeVisible()
  37  |   await expect(preview.getByRole('article').nth(1).getByRole('heading', { name: 'Agenda' })).toBeVisible()
  38  |   await expect(preview.getByRole('article').nth(1).getByRole('listitem').nth(0)).toHaveText('Item one')
  39  |   await expect(preview.getByRole('article').nth(1).getByRole('listitem').nth(1)).toHaveText('Item two')
  40  |   await expect(status(page)).toContainText('2 slides')
  41  | })
  42  | 
  43  | test('[A3] a new slide renders a task list and clicking a checkbox updates the editor text', async ({ page }) => {
  44  |   await page.goto('/')
  45  |   await append(page, '\n---\n\n- [ ] Task A\n- [x] Task B\n')
  46  |   await append(page, '\n')
  47  |   const third = page.getByRole('region', { name: 'Preview' }).getByRole('article').nth(2)
  48  |   await expect(third.getByText('Task A')).toBeVisible()
  49  |   await expect(third.getByText('Task B')).toBeVisible()
  50  |   await clickTaskACheckbox(page)
  51  |   await expect(page.getByRole('textbox')).toContainText('- [x] Task A')
  52  | })
  53  | 
  54  | test('[A4] the Preview and Editor tabs switch the main view and both stay visible', async ({ page }) => {
  55  |   await page.goto('/')
  56  |   const editor = page.getByRole('textbox')
  57  |   const preview = page.getByRole('region', { name: 'Preview' })
  58  |   const editorTab = page.getByRole('tab', { name: 'Editor' })
  59  |   const previewTab = page.getByRole('tab', { name: 'Preview' })
  60  |   await previewTab.click()
  61  |   await expect(editor).toBeHidden()
  62  |   await expect(preview.getByRole('article').first()).toBeVisible()
  63  |   await expect(previewTab).toBeVisible()
  64  |   await editorTab.click()
  65  |   await expect(editor).toBeVisible()
  66  |   await expect(previewTab).toBeVisible()
  67  | })
  68  | 
  69  | test('[A5] a table typed on a new slide renders with headers and a row', async ({ page }) => {
  70  |   await page.goto('/')
  71  |   await append(page, '\n---\n\n| Col 1 | Col 2 |\n|---|---|\n| A | B |\n')
  72  |   const table = page.getByRole('region', { name: 'Preview' }).getByRole('table')
  73  |   await expect(table).toBeVisible()
  74  |   await expect(table.getByRole('columnheader').nth(0)).toHaveText('Col 1')
  75  |   await expect(table.getByRole('columnheader').nth(1)).toHaveText('Col 2')
  76  |   await expect(table.getByRole('row').nth(1).getByRole('cell').nth(0)).toHaveText('A')
  77  |   await expect(table.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText('B')
  78  | })
  79  | 
  80  | test('[A6] the Export menu offers Print and a JSON download of the deck text', async ({ page }) => {
  81  |   await page.goto('/')
  82  |   await page.getByRole('button', { name: 'Export' }).click()
  83  |   const menu = page.getByRole('menu')
  84  |   await expect(menu.getByRole('menuitem', { name: 'Print' })).toBeVisible()
  85  |   await expect(menu.getByRole('menuitem', { name: 'JSON' })).toBeVisible()
  86  |   // window.print() in headless Chromium does not open a dialog or fire a
  87  |   // Playwright-observable event. Verify the click path works by confirming the
  88  |   // app remains stable and the Export menu reopens for the JSON download.
  89  |   await menu.getByRole('menuitem', { name: 'Print' }).click()
  90  |   await page.waitForTimeout(200)
  91  |   await expect(page.getByRole('button', { name: 'Export' })).toBeEnabled()
  92  |   await page.getByRole('button', { name: 'Export' }).click()
  93  |   const [download] = await Promise.all([
  94  |     page.waitForEvent('download'),
  95  |     page.getByRole('menuitem', { name: 'JSON' }).click(),
  96  |   ])
  97  |   expect(download.suggestedFilename()).toBe('deck.json')
  98  |   expect(await fs.readFile(await download.path(), 'utf8')).toBe('# Welcome\n\nThis is a demo slide.')
  99  | })
  100 | 
  101 | test('[A7] Undo reverts the last typed edit back to one slide', async ({ page }) => {
  102 |   await page.goto('/')
  103 |   await append(page, '# Agenda')
  104 |   await page.getByRole('button', { name: 'Undo' }).click()
  105 |   await expect(page.getByRole('textbox')).not.toContainText('# Agenda')
  106 |   await expect(status(page)).toContainText('1 slide')
  107 | })
  108 | 
  109 | test('[A8] the status bar reports the cursor slide as "Slide N of M"', async ({ page }) => {
  110 |   await page.goto('/')
  111 |   await append(page, '\n---\n\n## Agenda\n\n- Item one\n- Item two\n')
  112 |   const editor = page.getByRole('textbox')
  113 |   await editor.click()
  114 |   await page.keyboard.press('Control+Home')
  115 |   await expect(status(page)).toHaveText(/Slide 1 of 2/)
  116 |   await page.keyboard.press('Control+End')
  117 |   await expect(status(page)).toHaveText(/Slide 2 of 2/)
  118 | })
  119 | 
  120 | test('[A9] the deck text survives a reload and the preview keeps the new slide', async ({ page }) => {
> 121 |   await page.goto('/')
      |              ^ Error: page.goto: Protocol error (Page.navigate): Cannot navigate to invalid URL
  122 |   await append(page, '# New Slide')
  123 |   await page.reload()
  124 |   await expect(page.getByRole('textbox')).toContainText('# New Slide')
  125 |   await expect(page.getByRole('region', { name: 'Preview' }).getByRole('heading', { name: 'New Slide' })).toBeVisible()
  126 | })
  127 | 
```