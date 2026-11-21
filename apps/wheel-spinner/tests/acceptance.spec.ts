import { expect, test, type Page } from '@playwright/test'

function addEntry(page: Page, name: string) {
  return page.getByLabel('Entry name').fill(name).then(() => page.getByRole('button', { name: 'Add entry' }).click())
}

async function addAlice(page: Page) {
  await addEntry(page, 'Alice')
}

async function addAliceAndBob(page: Page) {
  await addEntry(page, 'Alice')
  await addEntry(page, 'Bob')
}

function winnerIsEitherAliceOrBob(winner: string) {
  expect(['Alice', 'Bob']).toContain(winner)
}

async function spinWinner(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Spin' }).click()
  const winner = await page.getByText(/Winner: (Alice|Bob)/, { exact: true }).first().innerText()
  return winner.replace(/^Winner: /, '')
}

test('[A1] on load the page shows the heading and "No entries yet" in the entries list area', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Wheel Spinner' })).toBeVisible()
  await expect(page.getByText('No entries yet')).toBeVisible()
})

test('[A2] adding Alice via the labelled field and the Add entry button shows a list item with Alice and removes "No entries yet"', async ({ page }) => {
  await page.goto('/')
  await addAlice(page)
  await expect(page.getByText('Alice', { exact: true })).toBeVisible()
  await expect(page.getByText('No entries yet')).toHaveCount(0)
})

test('[A3] spinning with Alice and Bob shows a result banner naming exactly one of the two entries', async ({ page }) => {
  await page.goto('/')
  await addAliceAndBob(page)
  const winner = await spinWinner(page)
  winnerIsEitherAliceOrBob(winner)
})

test('[A4] Copy result copies the current result banner text to the clipboard', async ({ page }) => {
  await page.goto('/')
  await addAliceAndBob(page)
  const winner = await spinWinner(page)
  await page.getByRole('button', { name: 'Copy result' }).click()
  const clip = await page.evaluate(async () => navigator.clipboard.readText())
  expect(clip).toBe(`Winner: ${winner}`)
})

test('[A5] the History tab shows a "Spin log" table with a row for the last winner and a timestamp', async ({ page }) => {
  await page.goto('/')
  await addAliceAndBob(page)
  const winner = await spinWinner(page)
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('table', { name: 'Spin log' })).toBeVisible()
  const rows = page.getByRole('table', { name: 'Spin log' }).getByRole('row')
  await expect(rows.first()).toBeVisible()
  const bodyRows = await rows.filter({ hasText: winner }).count()
  expect(bodyRows, 'a data row contains the winner name').toBeGreaterThan(0)
  const rowText = await rows.nth(1).innerText()
  expect(rowText, 'a data row has a timestamp alongside the winner').toMatch(/\d{1,2}:\d{2}/)
})

test('[A6] Delete Bob removes only the Bob list item, leaving Alice', async ({ page }) => {
  await page.goto('/')
  await addAliceAndBob(page)
  await page.getByRole('button', { name: 'Delete Bob' }).click()
  await expect(page.getByText('Alice', { exact: true })).toBeVisible()
  await expect(page.getByText('Bob', { exact: true })).toHaveCount(0)
})

test('[A7] Reset all clears the entries list to "No entries yet" and the History table to "No spins yet"', async ({ page }) => {
  await page.goto('/')
  await addAliceAndBob(page)
  await spinWinner(page)
  await page.getByRole('button', { name: 'Reset all' }).click()
  await expect(page.getByText('No entries yet')).toBeVisible()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('No spins yet')).toBeVisible()
})

test('[A8] adding Carol while Alice is present shows both Alice and Carol in the entries list', async ({ page }) => {
  await page.goto('/')
  await addAlice(page)
  await addEntry(page, 'Carol')
  await expect(page.getByText('Alice', { exact: true })).toBeVisible()
  await expect(page.getByText('Carol', { exact: true })).toBeVisible()
})

test('[A9] reload keeps the entry Alice in the list and the spin log row in the History tab after a spin', async ({ page }) => {
  await page.goto('/')
  await addAliceAndBob(page)
  const winner = await spinWinner(page)
  await page.reload()
  await expect(page.getByText('Alice', { exact: true })).toBeVisible()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('table', { name: 'Spin log' })).toBeVisible()
  await expect(page.getByRole('table', { name: 'Spin log' }).getByText(winner, { exact: true })).toBeVisible()
})
