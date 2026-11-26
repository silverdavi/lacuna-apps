import { expect, test } from '@playwright/test'

function addBirthday(name: string, date: string, notes?: string) {
  return { name, date, notes }
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Birthday Reminder' })).toBeVisible()
  await expect(page.getByText('No birthdays yet')).toBeVisible()
})

test('[A2] adding Alice shows May 15 and clears empty state', async ({ page }) => {
  await page.goto('/')
  const data = addBirthday('Alice', '1990-05-15', 'Loves cake')
  await page.getByLabel('Name').fill(data.name)
  await page.getByLabel('Birth date').fill(data.date)
  await page.getByLabel('Notes').fill(data.notes!)
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByText('No birthdays yet')).toHaveCount(0)
  const item = page.locator('li, [role="listitem"]').filter({ hasText: data.name })
  await expect(item).toContainText('May 15')
})

test('[A3] calendar shows Alice on May 15 and detail panel opens', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByLabel('Notes').fill('Loves cake')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('tab', { name: 'Calendar' }).click()
  const cell = page.locator('td, [role="gridcell"]').filter({ hasText: 'May 15' }).first()
  await expect(cell).toContainText('Alice')
  await cell.click()
  await expect(page.getByText('Loves cake').first()).toBeVisible()
  await expect(page.getByText('Alice').first()).toBeVisible()
})

test('[A4] adding Bob gives two list items', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Name').fill('Bob')
  await page.getByLabel('Birth date').fill('1985-12-25')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Bob' })).toContainText('Dec 25')
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Alice' })).toHaveCount(1)
})

test('[A5] deleting Alice removes list entry and calendar cell', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByLabel('Notes').fill('Loves cake')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Name').fill('Bob')
  await page.getByLabel('Birth date').fill('1985-12-25')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Delete Alice' }).click()
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Alice' })).toHaveCount(0)
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Bob' })).toHaveCount(1)
  await page.getByRole('tab', { name: 'Calendar' }).click()
  await expect(page.locator('td, [role="gridcell"]').filter({ hasText: 'May 15' }).first()).not.toContainText('Alice')
})

test('[A6] lead time 1 day triggers tomorrow notification', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByLabel('Notes').fill('Loves cake')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Reminder lead time').selectOption('1 day')
  await page.getByRole('button', { name: 'Save' }).click()
  // Shift the clock to May 14, 2024 so 1990-05-15 is "tomorrow".
  await page.evaluate(() => {
    const origNow = Date.now
    const target = new Date('2024-05-14T12:00:00')
    const offset = target.getTime() - origNow()
    ;(globalThis as any).Date = class extends Date {
      constructor(...args: ConstructorParameters<typeof Date>) {
        if (args.length === 0) super(origNow() + offset)
        else super(...args)
      }
      static now() {
        return origNow() + offset
      }
    }
  })
  await page.reload()
  await expect(page.getByText("Alice's birthday is tomorrow")).toBeVisible()
})

test('[A7] export CSV contains header and Alice row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByLabel('Notes').fill('Loves cake')
  await page.getByRole('button', { name: 'Save' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const csv = readFileSync(path, 'utf8')
  expect(csv).toContain('Name,Birth Date,Notes')
  expect(csv).toContain('Alice,1990-05-15,Loves cake')
})

test('[A8] search filters to Alice and clearing restores', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Name').fill('Bob')
  await page.getByLabel('Birth date').fill('1985-12-25')
  await page.getByRole('button', { name: 'Save' }).click()
  const search = page.getByLabel('Search')
  await search.fill('Ali')
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Alice' })).toHaveCount(1)
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Bob' })).toHaveCount(0)
  await search.fill('')
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Alice' })).toHaveCount(1)
  await expect(page.locator('li, [role="listitem"]').filter({ hasText: 'Bob' })).toHaveCount(1)
})

test('[A9] reload persists Alice', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Birth date').fill('1990-05-15')
  await page.getByLabel('Notes').fill('Loves cake')
  await page.getByRole('button', { name: 'Save' }).click()
  await page.reload()
  const item = page.locator('li, [role="listitem"]').filter({ hasText: 'Alice' })
  await expect(item).toContainText('May 15')
  await expect(item).toContainText('Loves cake')
})
