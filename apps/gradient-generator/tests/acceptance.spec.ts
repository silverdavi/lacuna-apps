import { expect, test, type Page } from '@playwright/test'

const preview = (page: Page) => page.getByRole('status', { name: 'CSS preview' })

async function addStop(page: Page) {
  await page.getByRole('button', { name: 'Add stop' }).click()
}

test('[A1] page shows heading and No gradients saved in the library panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gradient Generator' })).toBeVisible()
  await expect(page.getByText('No gradients saved')).toBeVisible()
})

test('[A2] clicking Add stop once adds Stop 1 with #ff0000 and 0%', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  const stop = page.getByRole('listitem').filter({ hasText: 'Stop 1' })
  await expect(stop).toBeVisible()
  await expect(stop.getByText('#ff0000', { exact: true })).toBeVisible()
  await expect(stop.getByText('0%', { exact: true })).toBeVisible()
})

test('[A3] typing 50 in Stop 1 Position and pressing Enter shows 50% and updates the CSS preview', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Stop 1' })
    .getByLabel('Position', { exact: true })
    .fill('50')
  await page.keyboard.press('Enter')
  const stop = page.getByRole('listitem').filter({ hasText: 'Stop 1' })
  await expect(stop.getByText('50%', { exact: true })).toBeVisible()
  await expect(preview(page)).toHaveText('linear-gradient(90deg, #ff0000 50%)')
})

test('[A4] clicking Add stop twice yields Stop 1 and Stop 2 with the full CSS preview', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  await addStop(page)
  const stop1 = page.getByRole('listitem').filter({ hasText: 'Stop 1' })
  await expect(stop1.getByText('#ff0000', { exact: true })).toBeVisible()
  await expect(stop1.getByText('0%', { exact: true })).toBeVisible()
  const stop2 = page.getByRole('listitem').filter({ hasText: 'Stop 2' })
  await expect(stop2.getByText('#0000ff', { exact: true })).toBeVisible()
  await expect(stop2.getByText('100%', { exact: true })).toBeVisible()
  await expect(preview(page)).toHaveText('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
})

test('[A5] selecting Radial in Type changes the CSS preview to radial-gradient', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  await addStop(page)
  await expect(preview(page)).toContainText('linear-gradient')
  await page.getByLabel('Type').selectOption('Radial')
  await expect(preview(page)).toHaveText('radial-gradient(circle, #ff0000 0%, #0000ff 100%)')
})

test('[A6] clicking Copy CSS puts the CSS preview text on the clipboard and shows the toast', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addStop(page)
  await addStop(page)
  await page.getByRole('button', { name: 'Copy CSS' }).click()
  await expect(page.getByRole('status', { name: 'CSS copied' })).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('linear-gradient(90deg, #ff0000 0%, #0000ff 100%)')
})

test('[A7] saving Sunset adds a library item and removes No gradients saved', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  await addStop(page)
  await page.getByLabel('Name').fill('Sunset')
  await page.getByRole('button', { name: 'Save gradient' }).click()
  await expect(page.getByText('No gradients saved')).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunset' })).toBeVisible()
})

test('[A8] clicking Delete Sunset removes it and No gradients saved returns', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  await addStop(page)
  await page.getByLabel('Name').fill('Sunset')
  await page.getByRole('button', { name: 'Save gradient' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunset' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Sunset' }).click()
  await expect(page.getByText('No gradients saved')).toBeVisible()
})

test('[A9] saved Sunset with Stop 1 at 50% survives a reload', async ({ page }) => {
  await page.goto('/')
  await addStop(page)
  await addStop(page)
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Stop 1' })
    .getByLabel('Position', { exact: true })
    .fill('50')
  await page.keyboard.press('Enter')
  await page.getByLabel('Name').fill('Sunset')
  await page.getByRole('button', { name: 'Save gradient' }).click()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Sunset' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Stop 1' }).getByText('50%', { exact: true })).toBeVisible()
})
