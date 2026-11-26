import { expect, test, type Page } from '@playwright/test'

const addZone = async (page: Page, name: string) => {
  await page.getByLabel('Zone name').fill(name)
  await page.getByRole('button', { name: 'Add zone' }).click()
}

const zoneItem = (page: Page, name: string) =>
  page.getByRole('listitem', { name, exact: false })

// The spec only fixes the "HH:MM:SS" shape of the copy text; the list item display is not fixed
// beyond "a time display showing the current time", so it is checked as a live H:M(:S) clock.
const clock = /\b\d{1,2}:\d{2}(:\d{2})?\b(\s*(?:AM|PM))?/i

test('[A1] the page heading is "World Clock"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'World Clock' })).toBeVisible()
})

test('[A2] with no zones added the list area shows "No zones yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No zones yet')).toBeVisible()
})

test('[A3] adding "New York" adds an item with a live America/New_York time and removes the empty state', async ({ page }) => {
  await page.goto('/')
  await addZone(page, 'New York')
  const item = zoneItem(page, 'New York')
  await expect(item).toBeVisible()
  await expect(item).toContainText('New York')
  await expect(page.getByText('No zones yet')).toHaveCount(0)
  // the displayed clock must agree with the actual America/New_York time at the moment of reading
  const shown = await item.innerText()
  const expected = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
  expect(shown).toContain(expected)
  expect(clock.test(shown)).toBe(true)
})

test('[A4] adding "Tokyo" after "New York" adds a second item with a live Asia/Tokyo time', async ({ page }) => {
  await page.goto('/')
  await addZone(page, 'New York')
  await addZone(page, 'Tokyo')
  const tokyo = zoneItem(page, 'Tokyo')
  await expect(tokyo).toBeVisible()
  await expect(tokyo).toContainText('Tokyo')
  expect(await page.getByRole('listitem').count()).toBe(2)
  const shown = await tokyo.innerText()
  const expected = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tokyo',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date())
  expect(shown).toContain(expected)
  expect(clock.test(shown)).toBe(true)
})

test('[A5] every item has a "Remove <zone name>" button and "Remove Tokyo" leaves only "New York"', async ({ page }) => {
  await page.goto('/')
  await addZone(page, 'New York')
  await addZone(page, 'Tokyo')
  await expect(page.getByRole('button', { name: 'Remove New York' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Remove Tokyo' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove Tokyo' }).click()
  const items = page.getByRole('listitem')
  expect(await items.count()).toBe(1)
  await expect(items.first()).toContainText('New York')
  await expect(items.first()).not.toContainText('Tokyo')
  await expect(page.getByText('Tokyo')).toHaveCount(0)
})

test('[A6] "Copy times" copies "New York: <HH:MM:SS>" and "Tokyo: <HH:MM:SS>" lines to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addZone(page, 'New York')
  await addZone(page, 'Tokyo')
  await page.getByRole('button', { name: 'Copy times' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  const lines = text.split('\n')
  expect(lines.length).toBe(2)
  expect(lines[0].startsWith('New York: ')).toBe(true)
  expect(lines[1].startsWith('Tokyo: ')).toBe(true)
  const hms = /\d{2}:\d{2}:\d{2}/
  expect(hms.test(lines[0])).toBe(true)
  expect(hms.test(lines[1])).toBe(true)
  // the copied times must be the real current times of the two zones
  const now = new Date()
  const ny = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
  const tk = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now)
  expect(lines[0]).toContain(ny)
  expect(lines[1]).toContain(tk)
})

test('[A7] the "Offsets" tab shows a table with Zone and UTC offset columns and the correct offsets', async ({ page }) => {
  await page.goto('/')
  await addZone(page, 'New York')
  await addZone(page, 'Tokyo')
  await page.getByRole('tab', { name: 'Offsets' }).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Zone' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'UTC offset' })).toBeVisible()
  const nyRow = page.getByRole('row', { name: /New York/ })
  await expect(nyRow).toBeVisible()
  await expect(nyRow).toContainText(/UTC(-05:00|-04:00)/)
  const tkRow = page.getByRole('row', { name: /Tokyo/ })
  await expect(tkRow).toBeVisible()
  await expect(tkRow).toContainText('UTC+09:00')
})

test('[A8] clicking the "Zone" column header sorts the offsets rows so "New York" comes before "Tokyo"', async ({ page }) => {
  await page.goto('/')
  await addZone(page, 'New York')
  await addZone(page, 'Tokyo')
  await page.getByRole('tab', { name: 'Offsets' }).click()
  await page.getByRole('columnheader', { name: 'Zone' }).click()
  const rows = page.getByRole('row')
  const names = []
  for (const r of await rows.all()) {
    const t = (await r.innerText()).trim()
    if (t) names.push(t)
  }
  expect(names.some((t) => t.includes('New York'))).toBe(true)
  expect(names.some((t) => t.includes('Tokyo'))).toBe(true)
  const nyAt = names.findIndex((t) => t.includes('New York'))
  const tkAt = names.findIndex((t) => t.includes('Tokyo'))
  expect(nyAt).toBeGreaterThanOrEqual(0)
  expect(tkAt).toBeGreaterThanOrEqual(0)
  expect(nyAt).toBeLessThan(tkAt)
})

test('[A9] reloading the page keeps the added zones with their live time displays', async ({ page }) => {
  await page.goto('/')
  await addZone(page, 'New York')
  await addZone(page, 'Tokyo')
  await page.reload()
  const ny = zoneItem(page, 'New York')
  const tk = zoneItem(page, 'Tokyo')
  await expect(ny).toBeVisible()
  await expect(tk).toBeVisible()
  await expect(page.getByText('No zones yet')).toHaveCount(0)
  for (const [item, zone] of [
    [ny, 'America/New_York'],
    [tk, 'Asia/Tokyo'],
  ] as const) {
    const shown = await item.innerText()
    expect(clock.test(shown)).toBe(true)
    const expected = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date())
    expect(shown).toContain(expected)
  }
})
