import { expect, test, type Page } from '@playwright/test'

// The seeded bracket is the same in every test (A3–A9):
// round one = Alice vs Bob, Carol vs Dave; second round = winner1 vs winner2;
// final = second-round winners. Scores default to 1-0 (per A7/A8).
async function addPlayer(page: Page, name: string) {
  await page.getByRole('tab', { name: 'Players' }).click()
  await page.getByLabel('Player name').fill(name)
  await page.getByRole('button', { name: 'Add player' }).click()
}

async function addAllPlayers(page: Page) {
  await addPlayer(page, 'Alice')
  await addPlayer(page, 'Bob')
  await addPlayer(page, 'Carol')
  await addPlayer(page, 'Dave')
}

async function finishBracket(page: Page) {
  await page.getByRole('tab', { name: 'Bracket' }).click()
  await page.getByRole('button', { name: 'Winner: Alice' }).first().click()
  await page.getByRole('button', { name: 'Winner: Dave' }).click()
  await page.getByRole('button', { name: 'Winner: Alice' }).click()
}

test('[A1] heading reads "Tournament Bracket" and the Bracket tab is active by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tournament Bracket' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Bracket' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] adding "Alice" adds a players-table row with the name "Alice" and seed "1"', async ({ page }) => {
  await page.goto('/')
  await addPlayer(page, 'Alice')
  const row = page.getByRole('row').filter({ hasText: 'Alice' })
  await expect(row).toContainText('Alice')
  await expect(row).toContainText('1')
})

test('[A3] four players show "Alice vs Bob", "Carol vs Dave" and two empty second-round slots', async ({ page }) => {
  await page.goto('/')
  await addAllPlayers(page)
  await page.getByRole('tab', { name: 'Bracket' }).click()
  await expect(page.getByText('Alice vs Bob')).toBeVisible()
  await expect(page.getByText('Carol vs Dave')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Winner: Alice' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Winner: Bob' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Winner: Carol' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Winner: Dave' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: /Winner: (Alice|Bob|Carol|Dave)/ })).toHaveCount(4)
})

test('[A4] "Winner: Alice" highlights "Alice" and advances her into the first second-round slot', async ({ page }) => {
  await page.goto('/')
  await addAllPlayers(page)
  await page.getByRole('tab', { name: 'Bracket' }).click()
  await page.getByRole('button', { name: 'Winner: Alice' }).first().click()
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Winner: Bob' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Winner: Alice' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Winner: Carol' })).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Winner: Dave' })).toHaveCount(1)
})

test('[A5] winners "Alice" and "Dave" make the second-round slot read "Alice vs Dave"', async ({ page }) => {
  await page.goto('/')
  await addAllPlayers(page)
  await page.getByRole('tab', { name: 'Bracket' }).click()
  await page.getByRole('button', { name: 'Winner: Alice' }).first().click()
  await page.getByRole('button', { name: 'Winner: Dave' }).click()
  await expect(page.getByText('Alice vs Dave')).toBeVisible()
})

test('[A6] "Winner: Alice" in the final displays "Champion: Alice" in the results area', async ({ page }) => {
  await page.goto('/')
  await addAllPlayers(page)
  await finishBracket(page)
  await expect(page.getByText('Champion: Alice')).toBeVisible()
})

test('[A7] the Results tab shows the final row "Final" / "Alice" / "1-0"', async ({ page }) => {
  await page.goto('/')
  await addAllPlayers(page)
  await finishBracket(page)
  await page.getByRole('tab', { name: 'Results' }).click()
  await expect(page.getByRole('columnheader', { name: 'Match' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Winner' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Score' })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: 'Final' })
  await expect(row).toContainText('Final')
  await expect(row).toContainText('Alice')
  await expect(row).toContainText('1-0')
})

test('[A8] "Export CSV" copies "Match,Winner,Score\\nFinal,Alice,1-0" to the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addAllPlayers(page)
  await finishBracket(page)
  await page.getByRole('button', { name: 'Export CSV' }).click()
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toBe('Match,Winner,Score\nFinal,Alice,1-0')
})

test('[A9] reload keeps the champion: "Champion: Alice" is still shown after reload', async ({ page }) => {
  await page.goto('/')
  await addAllPlayers(page)
  await finishBracket(page)
  await expect(page.getByText('Champion: Alice')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Champion: Alice')).toBeVisible()
})
