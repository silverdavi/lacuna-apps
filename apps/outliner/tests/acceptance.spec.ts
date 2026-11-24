import { expect, test } from '@playwright/test'

test('[A1] page heading', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Outline App' })).toBeVisible()
})

test('[A2] add item creates "New item" in the tree', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByText('New item')).toBeVisible()
})

test('[A3] indent an item to level 1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const before = await page.getByText('New item').first().boundingBox()
  await page.getByRole('button', { name: 'Indent' }).click()
  const after = await page.getByText('New item').first().boundingBox()
  expect(after).not.toBeNull()
  expect(before).not.toBeNull()
  expect(after!.x, 'indented item should shift right').toBeGreaterThan(before!.x)
})

test('[A4] outdent an item back to level 0', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const atZero = await page.getByText('New item').first().boundingBox()
  await page.getByRole('button', { name: 'Indent' }).click()
  await page.getByRole('button', { name: 'Outdent' }).click()
  const backToZero = await page.getByText('New item').first().boundingBox()
  expect(backToZero).not.toBeNull()
  expect(atZero).not.toBeNull()
  expect(backToZero!.x, 'outdented item should return to level-0 x position').toBe(atZero!.x)
})

test('[A5] drag item A below item B reorders the list', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByRole('button', { name: 'Add item' }).click()
  const items = page.getByText('New item')
  await expect(items).toHaveCount(2)

  const first = items.nth(0)
  const second = items.nth(1)
  const firstBox = await first.boundingBox()
  const secondBox = await second.boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  expect(firstBox!.y).toBeLessThan(secondBox!.y)

  // Drag the first item below the second using the drag handle.
  const handle = first.locator(
    'xpath=ancestor::*[contains(@class,"drag") or contains(@class,"handle") or contains(@class,"grip") or @draggable="true" or @role="treeitem" or self::li][1]'
  ).locator(
    '[draggable="true"], [class*="drag"], [class*="handle"], [class*="grip"], [class*="reorder"], [class*="move"]',
  ).first()

  const handleBox = await handle.boundingBox()
  expect(handleBox).not.toBeNull()

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(secondBox!.x + secondBox!.width / 2, secondBox!.y + secondBox!.height + 10, { steps: 15 })
  await page.mouse.up()

  // After the reorder, the original second item should now appear above the original first.
  const newFirst = items.nth(0)
  const newSecond = items.nth(1)
  const newFirstBox = await newFirst.boundingBox()
  const newSecondBox = await newSecond.boundingBox()
  expect(newFirstBox).not.toBeNull()
  expect(newSecondBox).not.toBeNull()
  expect(newFirstBox!.y).toBeLessThan(newSecondBox!.y)
  // The item that was originally second (lower y) should now be first (higher up).
  expect(newFirstBox!.y).toBeCloseTo(secondBox!.y, 0)
})

test('[A6] export markdown copies "- A\\n- B" to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.locator('input').first()
  await input.fill('A')
  await input.press('Enter')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input2 = page.locator('input').last()
  await input2.fill('B')
  await input2.press('Enter')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('- A\n- B')
})

test('[A7] collapse toggle on A hides its child B', async ({ page }) => {
  await page.goto('/')
  // Create item A at level 0.
  await page.getByRole('button', { name: 'Add item' }).click()
  const inputA = page.locator('input').first()
  await inputA.fill('A')
  await inputA.press('Enter')
  // Create item B, then indent it so it becomes a child of A.
  await page.getByRole('button', { name: 'Add item' }).click()
  const inputB = page.locator('input').last()
  await inputB.fill('B')
  await inputB.press('Enter')
  await page.getByRole('button', { name: 'Indent' }).click()

  await expect(page.getByText('A')).toBeVisible()
  await expect(page.getByText('B')).toBeVisible()

  // Click the collapse toggle on item A.
  const toggle = page.locator('[aria-expanded]').first()
  await toggle.click()

  await expect(page.getByText('B')).toHaveCount(0)
})

test('[A8] typing in the text input and pressing Enter updates the item text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.locator('input').first()
  await input.fill('Hello')
  await input.press('Enter')
  await expect(page.getByText('Hello')).toBeVisible()
})

test('[A9] outline persists across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add item' }).click()
  const input = page.locator('input').first()
  await input.fill('Test')
  await input.press('Enter')
  await page.reload()
  await expect(page.getByText('Test')).toBeVisible()
})
