import { expect, test } from '@playwright/test'

import { readFileSync } from 'node:fs'

test('[A1] heading reads "Baby Activity Log" and the empty list shows "No activities yet"', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Baby Activity Log' })).toBeVisible()
  await expect(page.getByText('No activities yet')).toBeVisible()
})

test('[A2] adding a Feeding of 120 min with notes Bottle lists Feeding 2h 0m and Bottle', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Feeding')
  await page.getByLabel('Duration (min)').fill('120')
  await page.getByLabel('Notes').fill('Bottle')
  await page.getByRole('button', { name: 'Add activity' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Feeding' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('2h 0m')
  await expect(item).toContainText('Bottle')
  await expect(page.getByText('No activities yet')).toHaveCount(0)
})

test('[A3] adding a Sleep of 45 min lists Sleep 45m', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Sleep')
  await page.getByLabel('Duration (min)').fill('45')
  await page.getByRole('button', { name: 'Add activity' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Sleep' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('45m')
})

test('[A4] adding a Diaper without a duration lists Diaper with an em dash', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Diaper')
  await page.getByRole('button', { name: 'Add activity' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'Diaper' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('—')
})

test('[A5] filtering by Feeding leaves only the Feeding entry', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Feeding')
  await page.getByLabel('Duration (min)').fill('120')
  await page.getByLabel('Notes').fill('Bottle')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByLabel('Type').selectOption('Sleep')
  await page.getByLabel('Duration (min)').fill('45')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByLabel('Type').selectOption('Diaper')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByRole('button', { name: 'Feeding', exact: true }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText('Feeding')
  await expect(items.first()).toContainText('2h 0m')
  await expect(items.first()).not.toContainText('Sleep')
  await expect(items.first()).not.toContainText('Diaper')
})

test('[A6] switching the filter back to All shows all three entries', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Feeding')
  await page.getByLabel('Duration (min)').fill('120')
  await page.getByLabel('Notes').fill('Bottle')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByLabel('Type').selectOption('Sleep')
  await page.getByLabel('Duration (min)').fill('45')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByLabel('Type').selectOption('Diaper')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByRole('button', { name: 'Feeding', exact: true }).click()
  await page.getByRole('button', { name: 'All', exact: true }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(3)
  await expect(items).toContainText('Feeding')
  await expect(items).toContainText('Sleep')
  await expect(items).toContainText('Diaper')
})

test('[A7] deleting the Feeding entry removes it and leaves Sleep and Diaper', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Feeding')
  await page.getByLabel('Duration (min)').fill('120')
  await page.getByLabel('Notes').fill('Bottle')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByLabel('Type').selectOption('Sleep')
  await page.getByLabel('Duration (min)').fill('45')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByLabel('Type').selectOption('Diaper')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.getByRole('button', { name: 'Delete Feeding', exact: true }).click()
  const items = page.getByRole('listitem')
  await expect(items).toHaveCount(2)
  await expect(items).toContainText('Sleep')
  await expect(items).toContainText('Diaper')
  await expect(items).not.toContainText('Feeding')
})

test('[A8] exporting CSV downloads a file with the type,timestamp,duration,notes header and the Feeding row', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Feeding')
  await page.getByLabel('Duration (min)').fill('120')
  await page.getByLabel('Notes').fill('Bottle')
  await page.getByRole('button', { name: 'Add activity' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const content = readFileSync(await download.path(), 'utf8')
  const lines = content.split('\n')
  expect(lines[0], 'first line is the CSV header').toBe('type,timestamp,duration,notes')
  expect(lines[1], 'second line is the Feeding row').toContain('Feeding')
  expect(lines[1], 'second line is the Feeding row').toContain('Bottle')
})

test('[A9] reloading the page keeps the Sleep entry', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Type').selectOption('Sleep')
  await page.getByLabel('Duration (min)').fill('45')
  await page.getByRole('button', { name: 'Add activity' }).click()
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'Sleep' })
  await expect(item).toHaveCount(1)
  await expect(item).toContainText('45m')
})
