import { expect, test, type Page } from '@playwright/test'

async function addFavorite(page: Page, name: string) {
  await page.getByLabel('Search').fill(name)
  await page.getByRole('button', { name: 'Add to favorites' }).click()
}

test('[A1] the page shows the heading "Emoji Picker" and "No favorites yet" in the Favorites tab', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Emoji Picker' })).toBeVisible()
  await page.getByRole('tab', { name: 'Favorites' }).click()
  await expect(page.getByText('No favorites yet')).toBeVisible()
})

test('[A2] typing "smile" shows a result containing "Smiling face" and "😀"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search').fill('smile')
  const item = page.getByRole('listitem', { name: 'Smiling face' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('😀')
})

test('[A3] clicking "Copy" on "Smiling face" copies "😀" and shows "Copied"', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Search').fill('smile')
  const item = page.getByRole('listitem', { name: 'Smiling face' })
  await item.getByRole('button', { name: 'Copy' }).click()
  await expect(item.getByText('Copied')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('😀')
})

test('[A4] typing "heart" shows a result containing "Red heart" and "❤️"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Search').fill('heart')
  const item = page.getByRole('listitem', { name: 'Red heart' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('❤️')
})

test('[A5] "Add to favorites" on "Red heart" moves it to the Favorites tab', async ({ page }) => {
  await page.goto('/')
  await addFavorite(page, 'heart')
  await page.getByRole('tab', { name: 'Favorites' }).click()
  const item = page.getByRole('listitem', { name: 'Red heart' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('❤️')
})

test('[A6] "Remove" on the "Red heart" favorite removes it and "No favorites yet" reappears', async ({
  page,
}) => {
  await page.goto('/')
  await addFavorite(page, 'heart')
  await page.getByRole('tab', { name: 'Favorites' }).click()
  const item = page.getByRole('listitem', { name: 'Red heart' })
  await item.getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('No favorites yet')).toBeVisible()
  await expect(page.getByRole('listitem', { name: 'Red heart' })).toHaveCount(0)
})

test('[A7] typing "smile" and pressing Enter copies "😀" and shows "Copied" on the first result', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  const search = page.getByLabel('Search')
  await search.fill('smile')
  await search.press('Enter')
  const first = page.getByRole('listitem').first()
  await expect(first.getByText('Copied')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('😀')
})

test('[A8] "Copy all" copies the favorites in order and shows "Copied all"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addFavorite(page, 'heart')
  await addFavorite(page, 'smile')
  await page.getByRole('tab', { name: 'Favorites' }).click()
  await page.getByRole('button', { name: 'Copy all' }).click()
  await expect(page.getByText('Copied all')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('❤️😀')
})

test('[A9] a favorite survives a reload', async ({ page }) => {
  await page.goto('/')
  await addFavorite(page, 'heart')
  await page.reload()
  await page.getByRole('tab', { name: 'Favorites' }).click()
  const item = page.getByRole('listitem', { name: 'Red heart' })
  await expect(item).toBeVisible()
  await expect(item).toContainText('❤️')
})
