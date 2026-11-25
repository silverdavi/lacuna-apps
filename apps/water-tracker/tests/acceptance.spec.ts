import { expect, test } from '@playwright/test'

test('[A1] heading and default goal', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Water Intake Tracker' })).toBeVisible()
  await expect(page.getByText('Goal: 2000 ml', { exact: true })).toBeVisible()
})

test('[A2] log 500 adds entry and updates progress', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('500')
  await page.getByRole('button', { name: 'Log intake' }).click()
  const entries = page.getByRole('list', { name: 'Entries' })
  await expect(entries.getByText('500 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('500 / 2000 ml', { exact: true })).toBeVisible()
})

test('[A3] two entries sum in progress ring', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('500')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByLabel('Amount (ml)').fill('750')
  await page.getByRole('button', { name: 'Log intake' }).click()
  const entries = page.getByRole('list', { name: 'Entries' })
  await expect(entries.getByText('500 ml', { exact: true })).toBeVisible()
  await expect(entries.getByText('750 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('1250 / 2000 ml', { exact: true })).toBeVisible()
})

test('[A4] deleting an entry updates list and progress', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('500')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByLabel('Amount (ml)').fill('750')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByRole('button', { name: 'Delete 500 ml' }).click()
  const entries = page.getByRole('list', { name: 'Entries' })
  await expect(entries.getByText('500 ml', { exact: true })).toHaveCount(0)
  await expect(entries.getByText('750 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('750 / 2000 ml', { exact: true })).toBeVisible()
})

test('[A5] saving a new goal updates display and progress ring', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Daily goal (ml)').fill('2500')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await expect(page.getByText('Goal: 2500 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('2500 ml', { exact: true })).toBeVisible()
})

test('[A6] heatmap cell for today shows total logged intake', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('500')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByLabel('Amount (ml)').fill('750')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByRole('tab', { name: 'Heatmap' }).click()
  await expect(page.getByText('1250', { exact: true })).toBeVisible()
})

test('[A7] trend chart has a data point for today equal to the total', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('500')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByLabel('Amount (ml)').fill('750')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByRole('tab', { name: 'Trend' }).click()
  const total = page.getByText('1250', { exact: true })
  await expect(total.first()).toBeVisible()
  const box = await total.first().boundingBox()
  expect(box, 'the 1250 label is inside the viewport').not.toBeNull()
})

test('[A8] reaching the goal increments the streak', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('1000')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByLabel('Amount (ml)').fill('1000')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await expect(page.getByText('Streak: 1 day', { exact: true })).toBeVisible()
})

test('[A9] reload keeps entries and custom goal', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Amount (ml)').fill('500')
  await page.getByRole('button', { name: 'Log intake' }).click()
  await page.getByLabel('Daily goal (ml)').fill('2500')
  await page.getByRole('button', { name: 'Save goal' }).click()
  await page.reload()
  const entries = page.getByRole('list', { name: 'Entries' })
  await expect(entries.getByText('500 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('Goal: 2500 ml', { exact: true })).toBeVisible()
  await expect(page.getByText('500 / 2500 ml', { exact: true })).toBeVisible()
})
