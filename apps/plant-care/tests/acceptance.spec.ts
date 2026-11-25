import { expect, test } from '@playwright/test'

test('[A1] first load shows heading, empty state, and Log tab', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Plant Watering Tracker' })).toBeVisible()
  await expect(page.getByText('No plants yet')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Log' })).toBeVisible()
})

test('[A2] adding a plant', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  const item = page.getByText('Fern')
  await expect(item).toContainText('every 3 days')
  await expect(page.getByText('No plants yet')).toHaveCount(0)
})

test('[A3] watering a plant logs it', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  await page.getByRole('button', { name: 'Water Fern' }).click()
  const item = page.getByText('Fern')
  await expect(item).toContainText('Last watered: today')
  await expect(item).toContainText('Streak: 1')
})

test('[A4] log tab shows the entry and a filled heatmap cell', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  await page.getByRole('button', { name: 'Water Fern' }).click()
  await page.getByRole('tab', { name: 'Log' }).click()
  await expect(page.getByRole('row')).toContainText('Fern')
  await expect(page.getByRole('row')).toContainText('1')
  const filled = page.evaluate(() =>
    document.body.innerHTML.match(/class="[^"]*cell[^"]*filled|class="[^"]*filled[^"]*"/g)?.length ?? 0
  )
  expect(filled, 'heatmap shows a filled cell').toBeGreaterThan(0)
})

test('[A5] deleting a plant', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  await page.getByRole('button', { name: 'Delete Fern' }).click()
  await expect(page.getByText('No plants yet')).toBeVisible()
})

test('[A6] adding a second plant', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Cactus')
  await page.getByLabel('Interval (days)').fill('7')
  await page.getByRole('button', { name: 'Add plant' }).click()
  const item = page.getByText('Cactus')
  await expect(item).toContainText('every 7 days')
})

test('[A7] advancing days to due shows the alert', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Advance day' }).click()
  }
  await expect(page.getByText('Fern')).toContainText('Due in: 0 days')
  await expect(page.getByText('Fern is due for water')).toBeVisible()
})

test('[A8] exporting the log copies it to the clipboard', async ({ page }) => {
  await page.goto('/')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  await page.getByRole('button', { name: 'Water Fern' }).click()
  await page.getByRole('button', { name: 'Export log' }).click()
  await expect(page.getByText('Log copied to clipboard')).toBeVisible()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toMatch(/^Fern,/m)
})

test('[A9] reload keeps the plant and its log', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Plant name').fill('Fern')
  await page.getByLabel('Interval (days)').fill('3')
  await page.getByRole('button', { name: 'Add plant' }).click()
  await page.getByRole('button', { name: 'Water Fern' }).click()
  await page.reload()
  await expect(page.getByText('Fern')).toContainText('every 3 days')
  await expect(page.getByText('Streak: 1')).toBeVisible()
})
