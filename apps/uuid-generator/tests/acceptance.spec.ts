import { expect, test, type Page } from '@playwright/test'

const history = (page: Page) => page.getByRole('list', { name: 'History' })

test('[A1] page shows the heading and the empty-history text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'UUID Generator' })).toBeVisible()
  await expect(page.getByText('No IDs generated yet')).toBeVisible()
})

test('[A2] generating with v4 adds a valid v4 UUID to the history', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Version').selectOption('v4')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(history(page).first()).toBeVisible()
  await expect(page.getByText('No IDs generated yet')).toBeHidden()
  const text = (await history(page).first().innerText()).trim()
  expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('[A3] generating with v1 adds a v1 UUID to the history', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Version').selectOption('v1')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(history(page).first()).toBeVisible()
  const text = (await history(page).first().innerText()).trim()
  expect(text).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-1[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
})

test('[A4] a batch of 5 adds five unique UUIDs to the history', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Batch size').fill('5')
  await page.getByRole('button', { name: 'Generate' }).click()
  const items = history(page)
  await expect(items).toHaveCount(5)
  const texts = (await items.allInnerTexts()).map((t) => t.trim())
  for (const t of texts) {
    expect(t).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  }
  expect(new Set(texts).size).toBe(5)
})

test('[A5] Copy all copies the history to the clipboard and shows Copied for 2 seconds', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Version').selectOption('v4')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByLabel('Batch size').fill('3')
  await page.getByRole('button', { name: 'Generate' }).click()
  const items = history(page)
  await expect(items).toHaveCount(4)
  const texts = (await items.allInnerTexts()).map((t) => t.trim())
  const expected = texts.join('\n')
  await page.getByRole('button', { name: 'Copy all' }).click()
  const btn = page.getByRole('button', { name: 'Copied' })
  await expect(btn).toBeVisible()
  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toBe(expected)
  // the label reverts to "Copy all" after 2 seconds
  await expect(page.getByRole('button', { name: 'Copy all' })).toBeVisible({ timeout: 3000 })
  await expect(btn).toBeHidden()
})

test('[A6] Clear history removes all items and shows the empty text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Batch size').fill('3')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(history(page)).toHaveCount(3)
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(history(page)).toHaveCount(0)
  await expect(page.getByText('No IDs generated yet')).toBeVisible()
})

test('[A7] a generated v4 UUID survives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Version').selectOption('v4')
  await page.getByRole('button', { name: 'Generate' }).click()
  const uuid = (await history(page).first().innerText()).trim()
  await page.reload()
  await expect(history(page)).toHaveCount(1)
  await expect(history(page).first()).toHaveText(uuid)
})

test('[A8] Delete removes a specific item and the empty text reappears when it was the last', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Version').selectOption('v4')
  await page.getByRole('button', { name: 'Generate' }).click()
  const uuid = (await history(page).first().innerText()).trim()
  await page.getByRole('button', { name: `Delete ${uuid.slice(0, 8)}` }).click()
  await expect(history(page)).toHaveCount(0)
  await expect(page.getByText('No IDs generated yet')).toBeVisible()
})
