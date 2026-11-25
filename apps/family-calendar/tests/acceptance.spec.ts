import { expect, test } from '@playwright/test'

const saveDentist = async (page: import('@playwright/test').Page) => {
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill('Dentist')
  await page.getByLabel('Date').fill('2025-06-10')
  await page.getByLabel('Time').fill('14:00')
  await page.getByRole('button', { name: 'Save' }).click()
}

test('[A1] heading and default view', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Family Calendar' })).toBeVisible()
  const week = page.getByRole('tab', { name: 'Week' })
  await expect(week).toBeVisible()
  await expect(week).toHaveAttribute('aria-selected', 'false')
})

test('[A2] adding Dentist shows it in June 2025 month grid', async ({ page }) => {
  await page.goto('/')
  await saveDentist(page)
  await expect(page.getByRole('heading', { name: 'June 2025' })).toBeVisible()
  const cell = page.getByRole('gridcell', { name: 'June 10, 2025' })
  const chip = cell.getByRole('listitem').filter({ hasText: 'Dentist' })
  await expect(chip).toHaveCount(1)
  await expect(chip).toContainText('14:00')
})

test('[A3] week view shows Dentist on Tuesday June 10', async ({ page }) => {
  await page.goto('/')
  await saveDentist(page)
  await page.getByRole('tab', { name: 'Week' }).click()
  const cell = page.getByRole('gridcell', { name: 'Tuesday, June 10, 2025' })
  const chip = cell.getByRole('listitem').filter({ hasText: 'Dentist' })
  await expect(chip).toHaveCount(1)
  await expect(chip).toContainText('14:00')
})

test('[A4] weekly repeat creates three events', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add event' }).click()
  await page.getByLabel('Title').fill('Yoga')
  await page.getByLabel('Date').fill('2025-06-12')
  await page.getByLabel('Time').fill('09:00')
  await page.getByLabel('Repeat').selectOption('Weekly')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('heading', { name: 'June 2025' })).toBeVisible()
  for (const name of ['June 12, 2025', 'June 19, 2025', 'June 26, 2025']) {
    const chip = page.getByRole('gridcell', { name }).getByRole('listitem').filter({ hasText: 'Yoga' })
    await expect(chip).toHaveCount(1)
    await expect(chip).toContainText('09:00')
  }
})

test('[A5] Export ICS contains the event', async ({ page }) => {
  await page.goto('/')
  await saveDentist(page)
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export ICS' }).click(),
  ])
  const path = await download.path()
  const content = await (await import('node:fs/promises')).readFile(path, 'utf8')
  await expect(content).toContain('SUMMARY:Dentist')
  await expect(content).toContain('DTSTART:20250610T140000')
})

test('[A6] adding a task shows 0/1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add' }).click()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).not.toBeChecked()
  await expect(page.getByText('0/1', { exact: true })).toBeVisible()
})

test('[A7] ticking a task shows 1/1 and line-through', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
  await expect(page.getByText('Buy milk')).toHaveCSS('text-decoration-line', 'line-through')
})

test('[A8] deleting Dentist removes it from month and week', async ({ page }) => {
  await page.goto('/')
  await saveDentist(page)
  const cell = page.getByRole('gridcell', { name: 'June 10, 2025' })
  await cell.getByRole('button', { name: 'Delete Dentist' }).click()
  await expect(cell.getByText('Dentist')).toHaveCount(0)
  await page.getByRole('tab', { name: 'Week' }).click()
  await expect(page.getByText('Dentist')).toHaveCount(0)
})

test('[A9] reload keeps event and task', async ({ page }) => {
  await page.goto('/')
  await saveDentist(page)
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await page.getByLabel('New task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('checkbox', { name: 'Buy milk' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'Month' }).click()
  // saved event navigates the grid to June 2025; use the month buttons if it does not
  const cell = page.getByRole('gridcell', { name: 'June 10, 2025' })
  // saved event navigates the grid to June 2025; fall back to the month buttons otherwise
  for (let i = 0; i < 24 && (await cell.count()) === 0; i++) {
    await page.getByRole('button', { name: 'Next month' }).click()
  }
  await expect(cell.getByRole('listitem').filter({ hasText: 'Dentist' })).toHaveCount(1)
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await expect(page.getByRole('checkbox', { name: 'Buy milk' })).toBeChecked()
  await expect(page.getByText('1/1', { exact: true })).toBeVisible()
})
