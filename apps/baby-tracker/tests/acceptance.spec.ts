import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function addFeeding(page: Page) {
  await page.getByLabel('Type').selectOption('Feeding')
  await page.getByLabel('Duration (min)').fill('120')
  await page.getByLabel('Notes').fill('Bottle')
  await page.getByRole('button', { name: 'Add activity' }).click()
}

async function addSleep(page: Page) {
  await page.getByLabel('Type').selectOption('Sleep')
  await page.getByLabel('Duration (min)').fill('45')
  await page.getByRole('button', { name: 'Add activity' }).click()
}

async function addDiaper(page: Page) {
  await page.getByLabel('Type').selectOption('Diaper')
  await page.getByRole('button', { name: 'Add activity' }).click()
}

test('[A1] empty app shows heading and placeholder', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Baby Activity Log' })).toBeVisible()
  await expect(page.getByText('No activities yet')).toBeVisible()
})

test('[A2] adding a feeding with duration and notes', async ({ page }) => {
  await page.goto('/')
  await addFeeding(page)
  // 'Bottle' is unique, so its textContent must carry the item text.
  await expect(page.getByText('Bottle')).toHaveText(/Feeding/)
  await expect(page.getByText('Bottle')).toHaveText(/2h 0m/)
  await expect(page.getByText('No activities yet')).toHaveCount(0)
})

test('[A3] adding a sleep with a duration', async ({ page }) => {
  await page.goto('/')
  await addSleep(page)
  // 'Sleep' is unique, so its textContent must carry the duration.
  await expect(page.getByText('Sleep').first()).toHaveText(/45m/)
})

test('[A4] adding a diaper without a duration shows an em dash', async ({ page }) => {
  await page.goto('/')
  await addDiaper(page)
  // 'Diaper' is unique, so its textContent must carry the dash.
  await expect(page.getByText('Diaper').first()).toHaveText(/—/)
})

test('[A5] the Feeding filter shows only the feeding', async ({ page }) => {
  await page.goto('/')
  await addFeeding(page)
  await addSleep(page)
  await addDiaper(page)
  await page.getByRole('button', { name: 'Feeding' }).click()
  await expect(page.getByText('Feeding').first()).toBeVisible()
  await expect(page.getByText('Sleep')).not.toBeVisible()
  await expect(page.getByText('Diaper')).not.toBeVisible()
})

test('[A6] the All filter shows every entry', async ({ page }) => {
  await page.goto('/')
  await addFeeding(page)
  await addSleep(page)
  await addDiaper(page)
  await page.getByRole('button', { name: 'Feeding' }).click()
  await page.getByRole('button', { name: 'All' }).click()
  await expect(page.getByText('Feeding').first()).toBeVisible()
  await expect(page.getByText('Sleep').first()).toBeVisible()
  await expect(page.getByText('Diaper').first()).toBeVisible()
})

test('[A7] deleting the feeding removes only that entry', async ({ page }) => {
  await page.goto('/')
  await addFeeding(page)
  await addSleep(page)
  await addDiaper(page)
  await page.getByRole('button', { name: 'Delete Feeding' }).click()
  await expect(page.getByText('Feeding')).not.toBeVisible()
  await expect(page.getByText('Sleep').first()).toBeVisible()
  await expect(page.getByText('Diaper').first()).toBeVisible()
})

test('[A8] exporting a CSV contains the header and the feeding row', async ({ page }) => {
  await page.goto('/')
  await addFeeding(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const contents = await readFile(await download.path(), 'utf8')
  const lines = contents.trim().split('\n')
  expect(lines[0]).toBe('type,timestamp,duration,notes')
  expect(lines[1]).toContain('Feeding')
  expect(lines[1]).toContain('Bottle')
})

test('[A9] entries persist across a reload', async ({ page }) => {
  await page.goto('/')
  await addSleep(page)
  await page.reload()
  // 'Sleep' is unique, so its textContent must carry the duration.
  await expect(page.getByText('Sleep').first()).toHaveText(/45m/)
})
