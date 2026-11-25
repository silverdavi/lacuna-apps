import { expect, test, type Page } from '@playwright/test'

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
const UUID36 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const historyItems = (page: Page) => page.getByRole('listitem')

// The app's delete button carries the first 8 characters of the UUID in its
// accessible name (spec A8), so read the first history item's UUID from the
// item's own text after the user has generated it.
async function firstUUID(page: Page) {
  const text = await historyItems(page).first().innerText()
  const match = text.match(UUID36)
  expect(match, `first history item shows a 36-character UUID, got "${text}"`).not.toBeNull()
  return match![0]
}

async function generate(page: Page, version: 'v4' | 'v1') {
  await page.getByLabel('Version').selectOption({ label: version })
  await page.getByRole('button', { name: 'Generate' }).click()
}

test('[A1] initial page shows the heading and the empty history state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'UUID Generator' })).toBeVisible()
  await expect(page.getByText('No IDs generated yet')).toBeVisible()
})

test('[A2] generating a v4 UUID adds a matching history item and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'v4')
  const items = historyItems(page)
  await expect(items).toHaveCount(1)
  const text = (await items.first().innerText()).trim()
  expect(text).toMatch(V4)
  await expect(page.getByText('No IDs generated yet')).toHaveCount(0)
})

test('[A3] generating a v1 UUID adds a history item with version digit 1 and variant 8/9/a/b', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'v1')
  const items = historyItems(page)
  await expect(items).toHaveCount(1)
  const text = (await items.first().innerText()).trim()
  expect(text).toMatch(UUID36)
  expect(text).toHaveLength(36)
  expect(text.charAt(12)).toBe('1')
  expect('89ab'.includes(text.charAt(16))).toBe(true)
})

test('[A4] batch size 5 adds exactly five unique UUIDs to the history', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Batch size').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  const items = historyItems(page)
  await expect(items).toHaveCount(5)
  const texts = await items.allInnerTexts()
  const unique = new Set<string>()
  for (const raw of texts) {
    const match = raw.match(UUID36)
    expect(match, `history item holds a 36-character UUID, got "${raw}"`).not.toBeNull()
    unique.add(match![0])
  }
  expect(unique.size).toBe(5)
})

test('[A5] Copy all copies the history UUIDs to the clipboard and the button reads Copied then Copy all', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Version').selectOption({ label: 'v4' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Generate' }).click()
  const texts = await historyItems(page).allInnerTexts()
  const expected = texts.map((t) => t.trim()).join('\n')

  await page.getByRole('button', { name: 'Copy all' }).click()
  // the button's own accessible name becomes "Copied" for 2 seconds; the
  // exact-phrase form below is safe where a role search for the word
  // "Copied" could also match the substring in "Copy all"
  await expect(page.getByRole('button', { name: /^Copied$/ }).first()).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toBe(expected)
  // it reverts to "Copy all" after 2 seconds
  await expect(page.getByRole('button', { name: /^Copied$/ }).first()).toBeHidden({ timeout: 5_000 })
  await expect(page.getByRole('button', { name: /^Copy all$/ })).toBeVisible()
})

test('[A6] Clear history removes all items and shows the empty state again', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Version').selectOption({ label: 'v4' })
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(historyItems(page)).toHaveCount(2)
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(historyItems(page)).toHaveCount(0)
  await expect(page.getByText('No IDs generated yet')).toBeVisible()
})

test('[A7] a generated v4 UUID is still in the history after a reload', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'v4')
  const uuid = await firstUUID(page)
  await page.reload()
  await expect(historyItems(page)).toHaveCount(1)
  await expect(historyItems(page).first()).toContainText(uuid)
})

test('[A8] Delete removes one specific item and the empty state reappears when it was the last', async ({ page }) => {
  await page.goto('/')
  await generate(page, 'v4')
  await generate(page, 'v4')
  const items = historyItems(page)
  await expect(items).toHaveCount(2)
  const [first, second] = await items.allInnerTexts()
  const firstUUIDText = first.match(UUID36)![0]
  const secondUUIDText = second.match(UUID36)![0]
  expect(firstUUIDText).not.toBe(secondUUIDText)

  await page.getByRole('button', { name: `Delete ${firstUUIDText.slice(0, 8)}` }).click()
  await expect(items).toHaveCount(1)
  await expect(items.first()).toContainText(secondUUIDText)
  await expect(page.getByText(firstUUIDText, { exact: true })).toHaveCount(0)

  await page.getByRole('button', { name: `Delete ${secondUUIDText.slice(0, 8)}` }).click()
  await expect(items).toHaveCount(0)
  await expect(page.getByText('No IDs generated yet')).toBeVisible()
})
