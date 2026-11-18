import { expect, test, type Page } from '@playwright/test'

async function addSubscription(page: Page, name: string, category: string, cost: string) {
  await page.getByLabel('Name').fill(name)
  await page.getByLabel('Category').selectOption(category)
  await page.getByLabel('Monthly cost').fill(cost)
  await page.getByRole('button', { name: 'Add subscription' }).click()
}

function row(page: Page, name: string) {
  return page.locator('tr').filter({ hasText: name })
}

function orderBefore(page: Page, first: string, second: string) {
  // reads the document order of the two rows after a user action; no page mutation
  return page.evaluate(
    ([a, b]) => [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(a) ?? false) <
      [...document.querySelectorAll('tr')].findIndex((r) => r.textContent?.includes(b) ?? false),
    [first, second],
  )
}

test('[A1] empty app shows heading, no-subscriptions text and zero total', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Subscription Tracker' })).toBeVisible()
  await expect(page.getByText('No subscriptions yet')).toBeVisible()
  await expect(page.getByText('Total monthly: $0.00')).toBeVisible()
})

test('[A2] adding a subscription shows it in a row and updates the total', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Netflix', 'Streaming', '15.99')
  await expect(page.getByText('No subscriptions yet')).toHaveCount(0)
  const r = row(page, 'Netflix')
  await expect(r).toContainText('Streaming')
  await expect(r).toContainText('$15.99')
  await expect(page.getByText('Total monthly: $15.99')).toBeVisible()
})

test('[A3] adding a second subscription sums the total', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Netflix', 'Streaming', '15.99')
  await addSubscription(page, 'Spotify', 'Music', '10.45')
  const r = row(page, 'Spotify')
  await expect(r).toContainText('Music')
  await expect(r).toContainText('$10.45')
  await expect(page.getByText('Total monthly: $26.44')).toBeVisible()
})

test('[A4] empty name, or empty, zero or negative cost, adds no row and shows the error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('')
  await page.getByLabel('Category').selectOption('Streaming')
  await page.getByLabel('Monthly cost').fill('15.99')
  await page.getByRole('button', { name: 'Add subscription' }).click()
  await expect(page.getByText('Enter a name and a cost greater than 0')).toBeVisible()

  await page.getByLabel('Name').fill('Netflix')
  await page.getByLabel('Monthly cost').fill('')
  await page.getByRole('button', { name: 'Add subscription' }).click()
  await expect(page.getByText('Enter a name and a cost greater than 0')).toBeVisible()

  await page.getByLabel('Monthly cost').fill('0')
  await page.getByRole('button', { name: 'Add subscription' }).click()
  await expect(page.getByText('Enter a name and a cost greater than 0')).toBeVisible()

  await page.getByLabel('Monthly cost').fill('-5')
  await page.getByRole('button', { name: 'Add subscription' }).click()
  await expect(page.getByText('Enter a name and a cost greater than 0')).toBeVisible()

  await expect(page.locator('tr').filter({ has: page.getByRole('button', { name: /Delete / }) })).toHaveCount(0)
  await expect(page.getByText('Total monthly: $0.00')).toBeVisible()
})

test('[A5] each row has a delete button and deleting updates the total', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Netflix', 'Streaming', '15.99')
  await addSubscription(page, 'Spotify', 'Music', '10.45')
  await expect(page.getByRole('button', { name: 'Delete Netflix' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete Spotify' })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Spotify' }).click()
  await expect(row(page, 'Spotify')).toHaveCount(0)
  await expect(page.getByText('Total monthly: $15.99')).toBeVisible()
})

test('[A6] a cost with more than two decimals is rounded in the row and the total', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Test', 'Other', '123.456')
  const r = row(page, 'Test')
  await expect(r).toContainText('$123.46')
  await expect(page.getByText('Total monthly: $123.46')).toBeVisible()
})

test('[A7] clicking the Name header sorts rows by name ascending', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Spotify', 'Music', '10.45')
  await addSubscription(page, 'Netflix', 'Streaming', '15.99')
  await page.getByRole('columnheader', { name: 'Name' }).click()
  expect(await orderBefore(page, 'Netflix', 'Spotify')).toBe(true)
})

test('[A8] clicking the Monthly cost header sorts rows by cost descending', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Netflix', 'Streaming', '15.99')
  await addSubscription(page, 'Spotify', 'Music', '10.45')
  await page.getByRole('columnheader', { name: 'Monthly cost' }).click()
  expect(await orderBefore(page, 'Netflix', 'Spotify')).toBe(true)
})

test('[A9] a subscription and its total survive a reload', async ({ page }) => {
  await page.goto('/')
  await addSubscription(page, 'Netflix', 'Streaming', '15.99')
  await page.reload()
  const r = row(page, 'Netflix')
  await expect(r).toContainText('$15.99')
  await expect(page.getByText('Total monthly: $15.99')).toBeVisible()
})
