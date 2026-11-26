import { expect, test } from '@playwright/test'

test('[A1] empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Grocery List' })).toBeVisible()
  await expect(page.getByText('No items yet')).toBeVisible()
  await expect(page.getByText('0 of 0 done')).toBeVisible()
})

test('[A2] add an item with name and quantity', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByText('Milk')).toBeVisible()
  await expect(page.getByText('×2')).toBeVisible()
  await expect(page.getByText('0 of 1 done')).toBeVisible()
  await expect(page.getByText('No items yet')).toHaveCount(0)
})

test('[A3] add a second item updates the progress', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Item name').fill('Bread')
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByText('Bread')).toBeVisible()
  await expect(page.getByText('×1')).toBeVisible()
  await expect(page.getByText('0 of 2 done')).toBeVisible()
})

test('[A4] adding without a name shows an error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByText('Enter an item name')).toBeVisible()
})

test('[A5] checking an item off and back on', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Item name').fill('Bread')
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Milk').check()
  await expect(page.getByText('1 of 2 done')).toBeVisible()
  await page.getByLabel('Milk').uncheck()
  await expect(page.getByText('0 of 2 done')).toBeVisible()
})

test('[A6] delete an item', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Item name').fill('Bread')
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByRole('button', { name: 'Delete Milk' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Bread' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Bread' }).click()
  await expect(page.getByText('Bread')).toHaveCount(0)
  await expect(page.getByText('0 of 1 done')).toBeVisible()
})

test('[A7] copy list to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Item name').fill('Bread')
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByRole('button', { name: 'Copy list' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Milk ×2\nBread ×1')
})

test('[A8] export as CSV', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Item name').fill('Bread')
  await page.getByLabel('Quantity').fill('1')
  await page.getByRole('button', { name: 'Add item' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  expect(Buffer.concat(chunks).toString('utf8')).toBe('name,quantity\nMilk,2\nBread,1')
})

test('[A9] the list persists across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Milk')
  await page.getByLabel('Quantity').fill('2')
  await page.getByRole('button', { name: 'Add item' }).click()
  await page.getByLabel('Milk').check()
  await page.reload()
  await expect(page.getByLabel('Milk')).toBeChecked()
  await expect(page.getByText('Milk')).toBeVisible()
  await expect(page.getByText('×2')).toBeVisible()
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})
