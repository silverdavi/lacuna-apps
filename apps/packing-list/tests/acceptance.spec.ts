import { expect, test, type Page } from '@playwright/test'

function firstListText(page: Page) {
  return page.evaluate(() => {
    const list = document.querySelector('ul, ol')
    if (!list) return null
    const first = list.querySelector('li')
    return first ? first.textContent : null
  })
}

async function addItems(page: Page, ...names: string[]) {
  for (const name of names) {
    await page.getByLabel('Item name').fill(name)
    await page.getByRole('button', { name: 'Add item' }).click()
  }
}

async function saveTripDetails(page: Page, destination: string, departureDate: string) {
  await page.getByRole('tab', { name: 'Trip details' }).click()
  await page.getByLabel('Destination').fill(destination)
  await page.getByLabel('Departure date').fill(departureDate)
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] empty app shows the heading and "No items yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Packing List' })).toBeVisible()
  await expect(page.getByText('No items yet')).toBeVisible()
})

test('[A2] adding Passport creates an unchecked item and removes "No items yet"', async ({ page }) => {
  await page.goto('/')
  await addItems(page, 'Passport')
  const item = page.getByRole('listitem').filter({ hasText: 'Passport' })
  await expect(item).toBeVisible()
  await expect(item.getByRole('checkbox')).not.toBeChecked()
  await expect(page.getByText('No items yet')).toHaveCount(0)
})

test('[A3] checking Passport off shows "1 of 2 packed"', async ({ page }) => {
  await page.goto('/')
  await addItems(page, 'Passport', 'Toothbrush')
  await page.getByRole('listitem').filter({ hasText: 'Passport' }).getByRole('checkbox').click()
  await expect(page.getByText('1 of 2 packed')).toBeVisible()
})

test('[A4] inline edit renames the Toothbrush item', async ({ page }) => {
  await page.goto('/')
  await addItems(page, 'Passport', 'Toothbrush')
  await page.getByRole('listitem').filter({ hasText: 'Toothbrush' }).getByRole('button', { name: 'Edit' }).click()
  await page.getByRole('textbox', { name: /Toothbrush/i }).fill('Toothpaste')
  await page.getByRole('textbox', { name: /Toothbrush/i }).press('Enter')
  await expect(page.getByRole('listitem').filter({ hasText: 'Toothpaste' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Toothbrush' })).toHaveCount(0)
})

test('[A5] Copy summary copies packed and remaining items to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addItems(page, 'Passport', 'Toothpaste')
  await page.getByRole('listitem').filter({ hasText: 'Passport' }).getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Copy summary' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Packed: Passport\nRemaining: Toothpaste')
})

test('[A6] Trip details form saves Destination and Departure date', async ({ page }) => {
  await page.goto('/')
  await saveTripDetails(page, 'Paris', '2025-06-15')
  await expect(page.getByRole('tab', { name: 'Trip details' })).toBeVisible()
  await expect(page.getByText('Paris')).toBeVisible()
  await expect(page.getByText('2025-06-15')).toBeVisible()
  await page.getByRole('tab', { name: 'Items' }).click()
  await page.getByRole('tab', { name: 'Trip details' }).click()
  await expect(page.getByLabel('Destination')).toHaveValue('Paris')
  await expect(page.getByLabel('Departure date')).toHaveValue('2025-06-15')
})

test('[A7] Alt+ArrowUp on Toothpaste moves it above Passport', async ({ page }) => {
  await page.goto('/')
  await addItems(page, 'Passport', 'Toothpaste')
  const toothpaste = page.getByRole('listitem').filter({ hasText: 'Toothpaste' })
  await toothpaste.focus()
  await page.keyboard.press('Alt+ArrowUp')
  expect(await firstListText(page)).toBe('Toothpaste')
})

test('[A8] Delete Toothpaste leaves one item and "1 of 1 packed"', async ({ page }) => {
  await page.goto('/')
  await addItems(page, 'Passport', 'Toothpaste')
  await page.getByRole('listitem').filter({ hasText: 'Toothpaste' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page.getByText('Passport')).toBeVisible()
  await expect(page.getByText('Toothpaste')).toHaveCount(0)
  await expect(page.getByText('1 of 1 packed')).toBeVisible()
})

test('[A9] items, check state and trip details survive reload and tab switching', async ({ page }) => {
  await page.goto('/')
  await addItems(page, 'Passport')
  await page.getByRole('listitem').filter({ hasText: 'Passport' }).getByRole('checkbox').click()
  await saveTripDetails(page, 'Paris', '2025-06-15')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Passport' }).getByRole('checkbox')).toBeChecked()
  await page.getByRole('tab', { name: 'Trip details' }).click()
  await expect(page.getByLabel('Destination')).toHaveValue('Paris')
  await expect(page.getByLabel('Departure date')).toHaveValue('2025-06-15')
})
