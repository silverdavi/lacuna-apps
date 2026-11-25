import { expect, test, type Page } from '@playwright/test'

// Spec: aria-level = level + 1 (top-level item has aria-level "1").

async function addItem(page: Page, name?: string) {
  await page.getByRole('button', { name: 'Add item' }).click()
  if (name !== undefined) {
    const input = page.getByRole('treeitem', { name: 'New item', exact: true }).last().getByRole('textbox', { name: 'Item text' })
    await input.fill(name)
    await input.press('Enter')
  }
}

test('[A1] page heading is "Outline App"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Outline App' })).toBeVisible()
})

test('[A2] Add item creates a tree item named "New item"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByRole('treeitem', { name: 'New item', exact: true })).toHaveCount(1)
})

test('[A3] Indent changes the level of the selected item', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'A')
  await page.getByRole('button', { name: 'Indent' }).click()
  const item = page.getByRole('treeitem', { name: 'A', exact: true })
  await expect(item).toHaveAttribute('aria-level', '2')
})

test('[A4] Outdent changes the level back to 0', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'A')
  await page.getByRole('button', { name: 'Indent' }).click()
  await page.getByRole('button', { name: 'Outdent' }).click()
  await expect(page.getByRole('treeitem', { name: 'A', exact: true })).toHaveAttribute('aria-level', '1')
})

test('[A5] dragging A below B reorders the items', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'A')
  await addItem(page, 'B')
  const handle = page.getByRole('button', { name: 'Drag A', exact: true })
  const target = page.getByRole('treeitem', { name: 'B', exact: true })
  const handleBox = await handle.boundingBox()
  const targetBox = await target.boundingBox()
  expect(handleBox).not.toBeNull()
  expect(targetBox).not.toBeNull()
  if (handleBox === null || targetBox === null) return
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height, { steps: 10 })
  await page.mouse.up()
  await expect(page.getByRole('treeitem').nth(0)).toHaveAttribute('aria-label', 'B')
  await expect(page.getByRole('treeitem').nth(1)).toHaveAttribute('aria-label', 'A')
})

test('[A6] Export Markdown puts the markdown on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addItem(page, 'A')
  await addItem(page, 'B')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('- A\n- B')
})

test('[A7] collapsing A removes B from view', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'A')
  await addItem(page, 'B')
  await page.getByRole('button', { name: 'Indent' }).click()
  await page.getByRole('button', { name: 'Collapse A', exact: true }).click()
  await expect(page.getByRole('treeitem', { name: 'A', exact: true })).toBeVisible()
  await expect(page.getByRole('treeitem', { name: 'B', exact: true })).toHaveCount(0)
})

test('[A8] typing text and pressing Enter renames the item', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.getByRole('treeitem', { name: 'New item', exact: true }).getByRole('textbox', { name: 'Item text' })
  await input.fill('Hello')
  await input.press('Enter')
  await expect(page.getByRole('treeitem', { name: 'Hello', exact: true })).toHaveCount(1)
})

test('[A9] reload keeps the outline', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Test')
  await page.reload()
  await expect(page.getByRole('treeitem', { name: 'Test', exact: true })).toHaveCount(1)
})
