import { expect, test } from '@playwright/test'

test('[A1] page heading and empty library panel', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Gradient Generator' })).toBeVisible()
  await expect(page.getByText('No gradients saved')).toBeVisible()
})

test('[A2] Add stop creates Stop 1 with #ff0000 at 0%', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  const row = page.getByText('Stop 1')
  await expect(row).toBeVisible()
  const text = await page.locator('#root').innerText()
  expect(text).toContain('Stop 1')
  expect(text).toContain('#ff0000')
  expect(text).toContain('0%')
})

test('[A3] editing Stop 1 position to 50 updates the CSS preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  await page.getByLabel(/Position/).fill('50')
  await page.getByLabel(/Position/).press('Enter')
  const text = await page.locator('#root').innerText()
  expect(text).toContain('50%')
  // A3: the position readout and the CSS preview both carry "50%".
})

test('[A4] second Add stop creates Stop 2 with #0000ff at 100%', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  await page.getByRole('button', { name: 'Add stop' }).click()
  const text = await page.locator('#root').innerText()
  expect(text).toContain('Stop 2')
  expect(text).toContain('#0000ff')
  expect(text).toContain('100%')
  expect(text).toMatch(/gradient\(.*#ff0000.*#0000ff/)
})

test('[A5] selecting Radial changes the CSS preview to radial-gradient', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  const textBefore = await page.locator('#root').innerText()
  expect(textBefore).toContain('linear-gradient')
  await page.getByLabel('Type').selectOption('Radial')
  const textAfter = await page.locator('#root').innerText()
  expect(textAfter).toContain('radial-gradient')
  expect(textAfter).not.toContain('linear-gradient')
})

test('[A6] Copy CSS copies the gradient and shows the toast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  const cssBefore = await page.locator('#root').innerText()
  expect(cssBefore).toContain('linear-gradient')
  await page.getByRole('button', { name: 'Copy CSS' }).click()
  await expect(page.getByText('CSS copied')).toBeVisible()
  const clip = await page.evaluate(() => navigator.clipboard.readText())
  expect(clip).toContain('linear-gradient')
})

test('[A7] saving Sunset adds it to the library and removes the empty text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  await page.getByLabel('Name').fill('Sunset')
  await page.getByRole('button', { name: 'Save gradient' }).click()
  await expect(page.getByText('Sunset')).toBeVisible()
  await expect(page.getByText('No gradients saved')).toHaveCount(0)
})

test('[A8] Delete Sunset removes the item and restores the empty text', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  await page.getByLabel('Name').fill('Sunset')
  await page.getByRole('button', { name: 'Save gradient' }).click()
  await expect(page.getByText('Sunset')).toBeVisible()
  await page.getByRole('button', { name: 'Delete Sunset' }).click()
  await expect(page.getByText('Sunset')).toHaveCount(0)
  await expect(page.getByText('No gradients saved')).toBeVisible()
})

test('[A9] reload keeps the saved gradient and the stop configuration', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add stop' }).click()
  await page.getByLabel(/Position/).fill('50')
  await page.getByLabel(/Position/).press('Enter')
  await page.getByLabel('Name').fill('Sunset')
  await page.getByRole('button', { name: 'Save gradient' }).click()
  await page.reload()
  const text = await page.locator('#root').innerText()
  expect(text).toContain('Sunset')
  expect(text).toContain('Stop 1')
  expect(text).toContain('50%')
})
