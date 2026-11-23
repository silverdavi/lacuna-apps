import { expect, test } from '@playwright/test'

async function addItem(page: import('@playwright/test').Page, name: string, quantity: string, category: string) {
  await page.getByLabel('Item name').fill(name)
  await page.getByLabel('Quantity').fill(quantity)
  await page.getByLabel('Category').selectOption(category)
  await page.getByRole('button', { name: 'Add item' }).click()
}

async function recordOutMovement(page: import('@playwright/test').Page, item: string, quantity: string) {
  const row = page.locator('table tr', { hasText: item }).first()
  await row.getByRole('button', { name: 'Record movement' }).click()
  await page.getByLabel('Quantity').fill(quantity)
  await page.getByLabel('Direction').selectOption('Out')
  await page.getByRole('button', { name: 'Save movement' }).click()
}

test('[A1] heading reads "Stock Inventory Manager" and empty state shows "No items in inventory"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Stock Inventory Manager' })).toBeVisible()
  await expect(page.getByText('No items in inventory')).toBeVisible()
})

test('[A2] adding an item adds a row with name, quantity and category; empty state gone', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  const row = page.locator('table tr', { hasText: 'Widget A' }).first()
  await expect(row).toContainText('Widget A')
  await expect(row).toContainText('10')
  await expect(row).toContainText('Tools')
  await expect(page.getByText('No items in inventory')).toBeHidden()
})

test('[A3] recording an out movement updates the row quantity and adds a movement entry', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await addItem(page, 'Gadget B', '5', 'Electronics')
  await recordOutMovement(page, 'Widget A', '3')
  const updatedRow = page.locator('table tr', { hasText: 'Widget A' }).first()
  await expect(updatedRow).toContainText('7')
  // Movement entry: "Out" is not a category and "3" is not a row's stored quantity, so a match only exists in the movement history.
  await expect(page.getByText('Out').first()).toBeVisible()
  await expect(page.getByText('3', { exact: true }).first()).toBeVisible()
})

test('[A4] search filters the table to matching rows', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await addItem(page, 'Gadget B', '5', 'Electronics')
  await page.getByLabel('Search').fill('Gadget')
  await expect(page.getByText('Gadget B')).toBeVisible()
  await expect(page.getByText('Widget A', { exact: true })).toBeHidden()
})

test('[A5] category chip filter shows only matching rows', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await addItem(page, 'Gadget B', '5', 'Electronics')
  await page.getByRole('button', { name: 'Tools' }).click()
  await expect(page.getByText('Widget A', { exact: true })).toBeVisible()
  await expect(page.getByText('Gadget B', { exact: true })).toBeHidden()
})

test('[A6] clicking Quantity header sorts rows descending', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await addItem(page, 'Gadget B', '5', 'Electronics')
  await recordOutMovement(page, 'Widget A', '3')
  await page.getByRole('columnheader', { name: 'Quantity' }).click()
  const rows = page.locator('table tbody tr')
  await expect(rows.first()).toContainText('Widget A')
  await expect(rows.nth(1)).toContainText('Gadget B')
})

test('[A7] Export CSV downloads a file with header and data rows', async ({ page }) => {
  // A7's expected row is "Widget A,7,Tools" but the check adds Widget A at 10 with no movement; recording the 3-out movement (as in A3/A6/A9) to reach 7.
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await recordOutMovement(page, 'Widget A', '3')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const { readFile } = await import('node:fs/promises')
  const content = await readFile(path!, 'utf-8')
  expect(content).toContain('Item name,Quantity,Category')
  expect(content).toContain('Widget A,7,Tools')
})

test('[A8] deleting a row removes it from the table', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await addItem(page, 'Gadget B', '5', 'Electronics')
  const gadgetRow = page.locator('table tr', { hasText: 'Gadget B' }).first()
  await gadgetRow.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Gadget B', { exact: true })).toBeHidden()
  await expect(page.getByText('Widget A', { exact: true })).toBeVisible()
})

test('[A9] reload keeps items and movement entries', async ({ page }) => {
  await page.goto('/')
  await addItem(page, 'Widget A', '10', 'Tools')
  await recordOutMovement(page, 'Widget A', '3')
  await page.reload()
  const row = page.locator('table tr', { hasText: 'Widget A' }).first()
  await expect(row).toContainText('7')
  await expect(row).toContainText('Tools')
  const movements = page.getByRole('tab', { name: 'Movements' })
  if (await movements.count()) {
    await movements.click()
  } else {
    await page.getByRole('button', { name: 'Movements' }).click()
  }
  await expect(page.getByText('Widget A').first()).toBeVisible()
  await expect(page.getByText('3', { exact: true }).first()).toBeVisible()
  await expect(page.getByText('Out').first()).toBeVisible()
})
