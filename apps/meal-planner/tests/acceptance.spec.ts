import { expect, test, type Page } from '@playwright/test'

async function addPasta(page: Page) {
  await page.getByRole('button', { name: 'Add Meal' }).click()
  await page.getByLabel('Meal Name').fill('Pasta')
  await page.getByLabel('Day').fill('Monday')
  await page.getByLabel('Ingredients').fill('Spaghetti, Tomato sauce')
  await page.getByRole('button', { name: 'Save' }).click()
}

async function addSalad(page: Page) {
  await page.getByRole('button', { name: 'Add Meal' }).click()
  await page.getByLabel('Meal Name').fill('Salad')
  await page.getByLabel('Day').fill('Tuesday')
  await page.getByLabel('Ingredients').fill('Lettuce, Tomato sauce')
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and both tabs are visible', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Meal Planner' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Week View' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Shopping List' })).toBeVisible()
})

test('[A2] saving a meal adds a row with the meal name and day', async ({ page }) => {
  await page.goto('/')
  await addPasta(page)
  const row = page.locator('tr').filter({ hasText: 'Pasta' })
  await expect(row).toContainText('Monday')
  await expect(page.getByRole('button', { name: 'Delete Pasta' })).toBeVisible()
})

test('[A3] the shopping list shows each ingredient of the meal', async ({ page }) => {
  await page.goto('/')
  await addPasta(page)
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Spaghetti' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Tomato sauce' })).toBeVisible()
})

// A4 and A6 both pin the copy format, and the only reading that satisfies both
// is the full "<name>: <quantity>" list, so A4 asserts the same.
test('[A4] a shared ingredient appears once with a quantity of 2', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addPasta(page)
  await addSalad(page)
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Tomato sauce' })).toHaveCount(1)
  await page.getByRole('button', { name: 'Copy List' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Lettuce: 1\nSpaghetti: 1\nTomato sauce: 2')
})

test('[A5] deleting a meal updates the week view and the shopping list', async ({ page }) => {
  await page.goto('/')
  await addPasta(page)
  await addSalad(page)
  await page.getByRole('button', { name: 'Delete Pasta' }).click()
  await expect(page.getByText('Pasta')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByText('Spaghetti')).toHaveCount(0)
  const tomato = page.getByRole('listitem').filter({ hasText: 'Tomato sauce' })
  await expect(tomato).toHaveCount(1)
  await expect(tomato).toContainText('1')
  await expect(page.getByText('Lettuce')).toBeVisible()
})

test('[A6] copy list copies "name: quantity" lines to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addPasta(page)
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await page.getByRole('button', { name: 'Copy List' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Spaghetti: 1\nTomato sauce: 1')
})

test('[A7] export ICS downloads meal-plan.ics containing SUMMARY:Pasta', async ({ page }) => {
  await page.goto('/')
  await addPasta(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('meal-plan.ics')
  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  expect(Buffer.concat(chunks).toString('utf8')).toContain('SUMMARY:Pasta')
})

test('[A8] empty app shows the no-meal and no-item texts', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No meals planned')).toBeVisible()
  await page.getByRole('tab', { name: 'Shopping List' }).click()
  await expect(page.getByText('No items to buy')).toBeVisible()
})

test('[A9] the meal survives a reload', async ({ page }) => {
  await page.goto('/')
  await addPasta(page)
  await page.reload()
  const row = page.locator('tr').filter({ hasText: 'Pasta' })
  await expect(row).toContainText('Monday')
})
