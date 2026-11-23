import { expect, test, type Page } from '@playwright/test'

async function addItem(page: Page, text?: string) {
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.getByRole('textbox', { name: /New item/ }).last()
  if (text !== undefined) {
    await input.fill(text)
  }
  await input.press('Enter')
}

test('[A1] the page heading is "Outline App"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Outline App' })).toBeVisible()
})

test('[A2] clicking "Add item" adds a new item with the text "New item"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByText('New item', { exact: true })).toBeVisible()
})

test('[A3] clicking "Indent" on an item changes its indent level to 1', async ({ page }) => {
  await page.goto('/')
  await addItem(page)
  const item = page.locator('li').filter({ hasText: 'New item' }).first()
  await item.getByRole('button', { name: 'Indent' }).click()
  // after indenting, the item is at level 1 so Outdent becomes available
  await expect(item.getByRole('button', { name: 'Outdent' })).toBeVisible()
  // Indent should no longer be the only action: the item has been indented
  await expect(item).toBeVisible()
})

test('[A4] clicking "Outdent" on an item at indent level 1 changes its indent level to 0', async ({ page }) => {
  await page.goto('/')
  await addItem(page)
  const item = page.locator('li').filter({ hasText: 'New item' }).first()
  await item.getByRole('button', { name: 'Indent' }).click()
  await item.getByRole('button', { name: 'Outdent' }).click()
  // back at level 0, Outdent is no longer available
  await expect(item.getByRole('button', { name: 'Outdent' })).toBeHidden()
  await expect(item).toBeVisible()
})

test('[A5] dragging item "A" below item "B" using the drag handle reorders the list', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'A')
  await addItem(page, 'B')
  const a = page.locator('li').filter({ hasText: 'A' }).first()
  const b = page.locator('li').filter({ hasText: 'B' }).first()
  // drag the handle on "A" to the lower half of "B" to move A below B
  const handle = a.getByRole('button', { name: /drag handle/i }).or(a.locator('[draggable="true"]'))
  const bBox = (await b.boundingBox())!
  await handle.first().dragTo(b, { targetPosition: { x: bBox.width / 2, y: bBox.height * 0.75 } })
  // after the reorder, B appears before A
  const boxes = [
    await page.locator('li').filter({ hasText: 'B' }).first().boundingBox(),
    await page.locator('li').filter({ hasText: 'A' }).first().boundingBox(),
  ]
  expect(boxes[0]).not.toBeNull()
  expect(boxes[1]).not.toBeNull()
  expect(boxes[0]!.y).toBeLessThan(boxes[1]!.y)
})

test('[A6] clicking "Export Markdown" copies the outline to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addItem(page, 'A')
  await addItem(page, 'B')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toBe('- A\n- B')
})

test('[A7] clicking the collapse toggle on "A" hides "B" from view', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'A')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.getByRole('textbox', { name: /New item/ }).last()
  await input.fill('B')
  await input.press('Enter')
  // indent B so it becomes a child of A
  const b = page.locator('li').filter({ hasText: 'B' }).first()
  await b.getByRole('button', { name: 'Indent' }).click()
  // collapse toggle on A hides its child B
  const a = page.locator('li').filter({ hasText: 'A' }).first()
  await a.getByRole('button', { name: /collapse|expand/i }).click()
  await expect(page.locator('li').filter({ hasText: 'B' }).first()).toBeHidden()
  await expect(a).toBeVisible()
})

test('[A8] typing "Hello" in the first item and pressing Enter updates the item text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.getByRole('textbox', { name: /New item/ }).first()
  await input.fill('Hello')
  await input.press('Enter')
  const item = page.locator('li').filter({ hasText: 'Hello' }).first()
  await expect(item).toBeVisible()
  await expect(page.locator('li').filter({ hasText: 'New item' })).toHaveCount(0)
})

test('[A9] reload keeps the outline structure', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Test')
  await page.reload()
  await expect(page.locator('li').filter({ hasText: 'Test' }).first()).toBeVisible()
})
