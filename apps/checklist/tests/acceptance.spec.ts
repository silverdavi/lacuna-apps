import { expect, test } from '@playwright/test'

// clipboard may need the document focused; harmless in a new tab.
async function focus(page: any) {
  await page.evaluate(() => (document as any).focus?.())
}

test('[A1] page shows the heading "Checklist App"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Checklist App' })).toBeVisible()
})

test('[A2] adding "Buy milk" shows the item and "0 of 1 done"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await expect(page.getByText('0 of 1 done')).toBeVisible()
})

test('[A3] checking "Buy milk" changes progress to "1 of 1 done"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Buy milk' })
    .getByRole('checkbox')
    .click()
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})

test('[A4] adding "Walk dog" shows the second item and "1 of 2 done"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task').fill('Walk dog')
  await page.getByRole('button', { name: 'Add task' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Walk dog' })).toBeVisible()
  await expect(page.getByText('1 of 2 done')).toBeVisible()
})

test('[A5] deleting "Walk dog" returns progress to "1 of 1 done"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task').fill('Walk dog')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Walk dog' })
    .getByRole('checkbox')
    .click()
  await page.getByRole('button', { name: 'Delete Walk dog' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Walk dog' })).toHaveCount(0)
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})

test('[A6] "Copy as Markdown" copies the Markdown to the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task').fill('Walk dog')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Walk dog' })
    .getByRole('checkbox')
    .click()
  await focus(page)
  await page.getByRole('button', { name: 'Copy as Markdown' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('- [ ] Buy milk\n- [x] Walk dog')
})

test('[A7] History shows "No history yet" until an event, then the event', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByText('No history yet')).toBeVisible()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('No history yet')).toBeVisible()
  await page.getByRole('tab', { name: 'Tasks' }).click()
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Buy milk' })
    .getByRole('checkbox')
    .click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('No history yet')).toHaveCount(0)
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
})

test('[A8] ArrowDown on the "Buy milk" handle moves it below "Walk dog"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByLabel('Task').fill('Walk dog')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page.getByText('Buy milk').first().locator('xpath=..').getByRole('button').focus()
  await page.keyboard.press('ArrowDown')
  const items = page.getByRole('listitem')
  await expect(items.first()).toContainText('Walk dog')
})

test('[A9] reload keeps "Buy milk" and its checked state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Task').fill('Buy milk')
  await page.getByRole('button', { name: 'Add task' }).click()
  await page
    .getByRole('listitem')
    .filter({ hasText: 'Buy milk' })
    .getByRole('checkbox')
    .click()
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'Buy milk' })).toBeVisible()
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Buy milk' }).getByRole('checkbox'),
  ).toBeChecked()
  await expect(page.getByText('1 of 1 done')).toBeVisible()
})
