import { expect, test, type Locator, type Page } from '@playwright/test'

const today = () => {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const shiftDay = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const oliveRow = (page: Page): Locator => page.getByRole('row', { name: /Olive Oil/ })
const milkRow = (page: Page): Locator => page.getByRole('row', { name: /Milk/ })

async function addOliveOil(page: Page) {
  await page.getByLabel('Item name', { exact: true }).fill('Olive Oil')
  await page.getByLabel('Quantity', { exact: true }).fill('2')
  await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'bottles' })
  await page.getByRole('button', { name: 'Add item', exact: true }).click()
}

async function addMilk(page: Page, expiration: string) {
  await page.getByLabel('Item name', { exact: true }).fill('Milk')
  await page.getByLabel('Quantity', { exact: true }).fill('1')
  await page.getByLabel('Unit', { exact: true }).selectOption({ label: 'carton' })
  await page.getByLabel('Expiration date', { exact: true }).fill(expiration)
  await page.getByRole('button', { name: 'Add item', exact: true }).click()
}

test('[A1] the empty app shows the heading and the no-items text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Pantry Inventory', exact: true })).toBeVisible()
  await expect(page.getByText('No items in your pantry yet', { exact: true })).toBeVisible()
})

test('[A2] adding Olive Oil 2 bottles shows a row with a Fresh badge and removes the no-items text', async ({ page }) => {
  await page.goto('/')
  await addOliveOil(page)
  const row = oliveRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Olive Oil')
  await expect(row).toContainText('2 bottles')
  await expect(row.getByText('Fresh', { exact: true })).toBeVisible()
  await expect(page.getByText('No items in your pantry yet', { exact: true })).toBeHidden()
})

test('[A3] editing Olive Oil back to 5 bottles pre-fills the form and updates the row', async ({ page }) => {
  await page.goto('/')
  await addOliveOil(page)
  await oliveRow(page).getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Item name', { exact: true })).toHaveValue('Olive Oil')
  await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('2')
  await expect(page.getByLabel('Unit', { exact: true })).toHaveValue('bottles')
  await page.getByLabel('Quantity', { exact: true }).fill('5')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(oliveRow(page)).toContainText('5 bottles')
})

test('[A4] adding Milk with an expiration date of yesterday shows an Expired badge', async ({ page }) => {
  await page.goto('/')
  await addMilk(page, shiftDay(-1))
  await expect(milkRow(page)).toContainText('Expired')
})

test('[A5] the Status filter hides and shows rows', async ({ page }) => {
  await page.goto('/')
  await addOliveOil(page)
  await addMilk(page, shiftDay(-1))
  await page.getByLabel('Status', { exact: true }).selectOption({ label: 'Expired' })
  await expect(milkRow(page)).toBeVisible()
  await expect(oliveRow(page)).toBeHidden()
  await page.getByLabel('Status', { exact: true }).selectOption({ label: 'All' })
  await expect(milkRow(page)).toBeVisible()
  await expect(oliveRow(page)).toBeVisible()
})

test('[A6] the search box filters by item name and clears to show all rows', async ({ page }) => {
  await page.goto('/')
  await addOliveOil(page)
  await addMilk(page, today())
  await page.getByLabel('Search items', { exact: true }).fill('olive')
  await expect(oliveRow(page)).toBeVisible()
  await expect(milkRow(page)).toBeHidden()
  await page.getByLabel('Search items', { exact: true }).fill('')
  await expect(oliveRow(page)).toBeVisible()
  await expect(milkRow(page)).toBeVisible()
})

test('[A7] Export CSV copies the CSV string to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addOliveOil(page)
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('Item name,Quantity,Unit,Expiration date,Status')
  expect(text).toContain('Olive Oil,2,bottles,,Fresh')
})

test('[A8] every row has a delete button and Delete Milk removes only Milk', async ({ page }) => {
  await page.goto('/')
  await addOliveOil(page)
  await addMilk(page, today())
  await expect(page.getByRole('button', { name: 'Delete Olive Oil', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Milk', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Milk', exact: true }).click()
  await expect(milkRow(page)).toHaveCount(0)
  await expect(oliveRow(page)).toBeVisible()
})

test('[A9] Olive Oil keeps its quantity and Fresh status after a full reload', async ({ page }) => {
  await page.goto('/')
  await addOliveOil(page)
  await page.reload()
  const row = oliveRow(page)
  await expect(row).toBeVisible()
  await expect(row).toContainText('Olive Oil')
  await expect(row).toContainText('2 bottles')
  await expect(row.getByText('Fresh', { exact: true })).toBeVisible()
})
