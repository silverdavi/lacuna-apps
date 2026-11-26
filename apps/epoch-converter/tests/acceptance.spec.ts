import { expect, test, type Page } from '@playwright/test'

const ts = (page: Page) => page.getByLabel('Unix timestamp', { exact: true })
const date = (page: Page) => page.getByLabel('Date', { exact: true })
const historyItem = (page: Page, text: string) => page.getByRole('listitem').filter({ hasText: text })

test('[A1] page heading and input pane initial values', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Epoch Converter' })).toBeVisible()
  await expect(ts(page)).toHaveValue('1700000000')
  await expect(date(page)).toHaveValue('2023-11-14T22:13:20Z')
})

test('[A2] typing 1609459200 into Unix timestamp updates Date to 2021-01-01T00:00:00Z', async ({ page }) => {
  await page.goto('/')
  await ts(page).fill('1609459200')
  await expect(date(page)).toHaveValue('2021-01-01T00:00:00Z')
})

test('[A3] typing 2024-02-29T12:00:00Z into Date updates Unix timestamp to 1709217600', async ({ page }) => {
  await page.goto('/')
  await date(page).fill('2024-02-29T12:00:00Z')
  await expect(ts(page)).toHaveValue('1709217600')
})

test('[A4] Copy timestamp shows the toast "Copied 1700000000"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy timestamp' }).click()
  await expect(page.getByText('Copied 1700000000')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('1700000000')
})

test('[A5] Copy date shows the toast "Copied 2023-11-14T22:13:20Z"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy date' }).click()
  await expect(page.getByText('Copied 2023-11-14T22:13:20Z')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('2023-11-14T22:13:20Z')
})

test('[A6] Now sets the Unix timestamp to the current time and updates the Date field', async ({ page }) => {
  await page.goto('/')
  const before = Math.floor(Date.now() / 1000)
  await page.getByRole('button', { name: 'Now' }).click()
  const value = await ts(page).inputValue()
  const after = Math.floor(Date.now() / 1000)
  // the timestamp must be within the last 60 seconds of the test run
  expect(Number(value)).toBeGreaterThanOrEqual(before - 60)
  expect(Number(value)).toBeLessThanOrEqual(after + 60)
  // the Date field must reflect the same instant
  const shown = await date(page).inputValue()
  expect(Math.floor(new Date(shown).getTime() / 1000)).toBe(Number(value))
})

test('[A7] converting 1609459200 to 2021-01-01T00:00:00Z adds a history item', async ({ page }) => {
  await page.goto('/')
  await ts(page).fill('1609459200')
  await expect(date(page)).toHaveValue('2021-01-01T00:00:00Z')
  const entry = historyItem(page, '1609459200 → 2021-01-01T00:00:00Z')
  await expect(entry).toBeVisible()
})

test('[A8] Clear history removes all items and shows "No history"', async ({ page }) => {
  await page.goto('/')
  await ts(page).fill('1609459200')
  await expect(historyItem(page, '1609459200 → 2021-01-01T00:00:00Z')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(historyItem(page, '1609459200 → 2021-01-01T00:00:00Z')).toHaveCount(0)
  await expect(page.getByText('No history')).toBeVisible()
})

test('[A9] reload keeps the history item 1609459200 to 2021-01-01T00:00:00Z', async ({ page }) => {
  await page.goto('/')
  await ts(page).fill('1609459200')
  await expect(historyItem(page, '1609459200 → 2021-01-01T00:00:00Z')).toBeVisible()
  await page.reload()
  await expect(historyItem(page, '1609459200 → 2021-01-01T00:00:00Z')).toBeVisible()
})
