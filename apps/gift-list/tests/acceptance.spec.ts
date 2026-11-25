import { expect, test, type Page } from '@playwright/test'

async function addGift(page: Page, item: string, recipient: string, price: string) {
  await page.getByLabel('Item').fill(item)
  await page.getByLabel('Recipient').fill(recipient)
  await page.getByLabel('Price').fill(price)
  await page.getByRole('button', { name: 'Add gift' }).click()
}

test('[A1] shows the heading and the empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gift List Tracker' })).toBeVisible()
  await expect(page.getByText('No gifts yet')).toBeVisible()
})

test('[A2] adds a gift and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await expect(page.getByText('No gifts yet')).toHaveCount(0)
  const row = page.getByRole('table').getByRole('row', { name: /Book/ })
  await expect(row).toContainText('Alice')
  await expect(row).toContainText('$15.00')
  await expect(row).toContainText('Pending')
})

test('[A3] marking a gift purchased toggles the status and the button label', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await page.getByRole('button', { name: 'Mark purchased' }).click()
  const row = page.getByRole('table').getByRole('row', { name: /Book/ })
  await expect(row).toContainText('Purchased')
  await expect(row).toContainText('Mark pending')
})

test('[A4] a second gift adds a second row', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await addGift(page, 'Toy', 'Bob', '20')
  await expect(page.getByRole('table').getByRole('row')).toHaveCount(2)
})

test('[A5] the filter chips show only the matching rows', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await addGift(page, 'Toy', 'Bob', '20')
  const purchased = page.getByRole('button', { name: 'Purchased' })
  const all = page.getByRole('button', { name: 'All' })
  await purchased.click()
  await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toHaveCount(0)
  await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  await all.click()
  await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toBeVisible()
})

test('[A6] the search box filters to matching rows', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await addGift(page, 'Toy', 'Bob', '20')
  const search = page.getByLabel('Search')
  await search.fill('Alice')
  await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toHaveCount(0)
  await search.fill('')
  await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toBeVisible()
  await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toBeVisible()
})

test('[A7] exports a CSV with the header and the purchased row', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await page.getByRole('button', { name: 'Mark purchased' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('gifts.csv')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('Item,Recipient,Price,Status')
  expect(csv).toContain('Book,Alice,15.00,Purchased')
})

test('[A8] deleting a gift removes the row', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await addGift(page, 'Toy', 'Bob', '20')
  await page.getByRole('button', { name: 'Delete Book' }).click()
  await expect(page.getByRole('table').getByRole('row', { name: /Book/ })).toHaveCount(0)
  await expect(page.getByRole('table').getByRole('row', { name: /Toy/ })).toBeVisible()
})

test('[A9] reload keeps the gift', async ({ page }) => {
  await page.goto('/')
  await addGift(page, 'Book', 'Alice', '15')
  await addGift(page, 'Toy', 'Bob', '20')
  await page.getByRole('button', { name: 'Delete Book' }).click()
  await page.reload()
  const row = page.getByRole('table').getByRole('row', { name: /Toy/ })
  await expect(row).toContainText('Bob')
  await expect(row).toContainText('Pending')
  await expect(row).toContainText('$20.00')
})
