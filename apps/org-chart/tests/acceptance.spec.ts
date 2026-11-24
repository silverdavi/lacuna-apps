import { expect, test } from '@playwright/test'

async function addRole(page: import('@playwright/test').Page, name: string, reportsTo?: string) {
  await page.getByLabel('Role name').fill(name)
  if (reportsTo) await page.getByLabel('Reports to').selectOption(reportsTo)
  await page.getByRole('button', { name: 'Add role' }).click()
}

test('[A1] page shows the heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Org Chart' })).toBeVisible()
  await expect(page.getByText('No roles yet')).toBeVisible()
})

test('[A2] adding a role creates a list item and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  const item = page.getByRole('listitem').filter({ hasText: 'CEO' })
  await expect(item).toBeVisible()
  await expect(page.getByText('No roles yet')).toHaveCount(0)
})

test('[A3] adding a role that reports to another indents it under that role', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  const cto = items.filter({ hasText: 'CTO' })
  await expect(cto).toBeVisible()
  const ceo = items.filter({ hasText: 'CEO' })
  const ctoBox = await cto.boundingBox()
  const ceoBox = await ceo.boundingBox()
  expect(ctoBox).not.toBeNull()
  expect(ceoBox).not.toBeNull()
  expect(ctoBox!.x).toBeGreaterThan(ceoBox!.x)
})

test('[A4] deleting a role removes it from the list', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  await page.getByRole('button', { name: 'Delete CTO' }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('CEO')
  await expect(page.getByText('CTO')).toHaveCount(0)
})

test('[A5] Export JSON copies the hierarchy to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('{"name":"CEO","children":[{"name":"CTO","children":[]}]}')
})

test('[A6] Outline tab shows the nested list and Canvas tab returns to the tree view', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  await page.getByRole('tab', { name: 'Outline' }).click()
  const cto = page.getByRole('listitem').filter({ hasText: 'CTO' })
  const ceo = page.getByRole('listitem').filter({ hasText: 'CEO' })
  const ctoBox = await cto.boundingBox()
  const ceoBox = await ceo.boundingBox()
  expect(ctoBox).not.toBeNull()
  expect(ceoBox).not.toBeNull()
  expect(ctoBox!.x).toBeGreaterThan(ceoBox!.x)
  await page.getByRole('tab', { name: 'Canvas' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'CEO' })).toBeVisible()
})

test('[A7] Zoom in changes the zoom indicator from 100% to 125%', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  await expect(page.getByText('100%')).toBeVisible()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByText('125%')).toBeVisible()
  await expect(page.getByText('100%')).toHaveCount(0)
})

test('[A8] Auto layout does not change the list order', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  await page.getByRole('button', { name: 'Auto layout' }).click()
  const items = page.getByRole('listitem')
  await expect(items.first()).toContainText('CEO')
  await expect(items.nth(1)).toContainText('CTO')
})

test('[A9] reload keeps the roles and their reporting structure', async ({ page }) => {
  await page.goto('/')
  await addRole(page, 'CEO')
  await addRole(page, 'CTO', 'CEO')
  await page.reload()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  const cto = items.filter({ hasText: 'CTO' })
  const ceo = items.filter({ hasText: 'CEO' })
  await expect(ceo).toBeVisible()
  await expect(cto).toBeVisible()
  const ctoBox = await cto.boundingBox()
  const ceoBox = await ceo.boundingBox()
  expect(ctoBox).not.toBeNull()
  expect(ceoBox).not.toBeNull()
  expect(ctoBox!.x).toBeGreaterThan(ceoBox!.x)
})
