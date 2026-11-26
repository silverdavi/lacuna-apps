import { expect, test, type Page } from '@playwright/test'

async function calculate(page: Page, mode: string, inputs: Record<string, string>) {
  await page.getByLabel('Mode').selectOption(mode)
  for (const [label, value] of Object.entries(inputs)) {
    await page.getByLabel(label).fill(value)
  }
  await page.getByRole('button', { name: 'Calculate' }).click()
}

test('[A1] the page heading is "Percentage Calculator"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Percentage Calculator' })).toBeVisible()
})

test('[A2] "What is X% of Y?" with Percent 20 and Value 50 shows result 10', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'What is X% of Y?', { Percent: '20', Value: '50' })
  await expect(page.getByText('10')).toBeVisible()
})

test('[A3] "What percent is X of Y?" with Part 10 and Whole 50 shows result 20%', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'What percent is X of Y?', { Part: '10', Whole: '50' })
  await expect(page.getByText('20%')).toBeVisible()
})

test('[A4] "Increase by X%" with Percent 15 and Original 100 shows result 115', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'Increase by X%', { Percent: '15', Original: '100' })
  await expect(page.getByText('115')).toBeVisible()
})

test('[A5] "Decrease by X%" with Percent 10 and Original 200 shows result 180', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'Decrease by X%', { Percent: '10', Original: '200' })
  await expect(page.getByText('180')).toBeVisible()
})

test('[A6] the "Copy result" button copies the exact result text to the clipboard', async ({ page, context }) => {
  // the copy click must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await calculate(page, 'What is X% of Y?', { Percent: '20', Value: '50' })
  await page.getByRole('button', { name: 'Copy result' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const after = await page.evaluate(() => navigator.clipboard.readText())
  expect(after).toBe('10')
})

test('[A7] the History tab lists the calculation with its mode name and result value', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'What is X% of Y?', { Percent: '20', Value: '50' })
  await page.getByRole('tab', { name: 'History' }).click()
  const entry = page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: 'What is X% of Y?' })
  await expect(entry.first()).toContainText('10')
})

test('[A8] the "Delete" button next to a history entry removes that entry', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'Increase by X%', { Percent: '15', Original: '100' })
  await calculate(page, 'Decrease by X%', { Percent: '10', Original: '200' })
  await page.getByRole('tab', { name: 'History' }).click()
  const first = page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: 'Increase by X%' })
  await first.getByRole('button', { name: 'Delete' }).click()
  await expect(page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: 'Increase by X%' })).toHaveCount(0)
  // the other entry is untouched
  await expect(page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: 'Decrease by X%' })).toContainText('180')
})

test('[A9] reload keeps the history list; the calculated entry is still visible', async ({ page }) => {
  await page.goto('/')
  await calculate(page, 'What percent is X of Y?', { Part: '10', Whole: '50' })
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  const entry = page.locator('li, tr, [role="listitem"], [role="row"]').filter({ hasText: 'What percent is X of Y?' })
  await expect(entry.first()).toContainText('20%')
})
