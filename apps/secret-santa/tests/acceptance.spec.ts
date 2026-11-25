import { expect, test, type Page } from '@playwright/test'

async function addParticipant(page: Page, name: string) {
  await page.getByLabel('Name', { exact: true }).fill(name)
  await page.getByRole('button', { name: 'Add participant', exact: true }).click()
}

const pairings = (page: Page) => page.getByRole('table', { name: 'Pairings', exact: true })

test('[A1] heading "Secret Santa" and the "No participants yet" empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Secret Santa', exact: true })).toBeVisible()
  await expect(page.getByText('No participants yet', { exact: true })).toBeVisible()
})

test('[A2] adding "Alice" shows her row and the "1 participant" count', async ({ page }) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await expect(page.getByText('No participants yet', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('row', { name: /Alice/ })).toBeVisible()
  await expect(page.getByText('1 participant', { exact: true })).toBeVisible()
})

test('[A3] adding "Bob" and "Carol" shows 3 rows and the "3 participants" count', async ({ page }) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await addParticipant(page, 'Bob')
  await addParticipant(page, 'Carol')
  await expect(page.getByRole('row', { name: /Alice/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Bob/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Carol/ })).toBeVisible()
  await expect(page.getByText('3 participants', { exact: true })).toBeVisible()
})

test('[A4] generating with only "Alice" shows "Need at least 2 participants"', async ({ page }) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  await expect(page.getByText('Need at least 2 participants', { exact: true })).toBeVisible()
  await expect(pairings(page)).toHaveCount(0)
})

test('[A5] generating with Alice, Bob, Carol shows Giver/Receiver columns with no self-pairing', async ({
  page,
}) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await addParticipant(page, 'Bob')
  await addParticipant(page, 'Carol')
  await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  const table = pairings(page)
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Giver', exact: true })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Receiver', exact: true })).toBeVisible()
  const rows = table.getByRole('row').filter({ hasNotText: 'Giver' })
  await expect(rows).toHaveCount(3)
  const names = ['Alice', 'Bob', 'Carol']
  for (const name of names) {
    const row = rows.filter({ hasText: name })
    const cells = row.getByRole('cell').allInnerTexts()
    const giver = cells[0].trim()
    const receiver = cells[1].trim()
    expect(receiver, `row for ${name}: receiver must not equal the giver`).not.toBe(giver)
  }
})

test('[A6] "No self-pairing" mode still pairs no one with themselves', async ({ page }) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await addParticipant(page, 'Bob')
  await addParticipant(page, 'Carol')
  await page.getByRole('tab', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Pairing mode', { exact: true }).selectOption({ label: 'No self-pairing' })
  await page.getByRole('tab', { name: 'Participants', exact: true }).click()
  await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  const table = pairings(page)
  await expect(table).toBeVisible()
  const rows = table.getByRole('row').filter({ hasNotText: 'Giver' })
  await expect(rows).toHaveCount(3)
  for (const name of ['Alice', 'Bob', 'Carol']) {
    const row = rows.filter({ hasText: name })
    const cells = row.getByRole('cell').allInnerTexts()
    expect(cells[1].trim(), `row for ${name}: no self-pairing in "No self-pairing" mode`).not.toBe(name)
  }
})

test('[A7] "Copy pairings" shows the toast "Pairings copied to clipboard"', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await addParticipant(page, 'Bob')
  await addParticipant(page, 'Carol')
  await page.getByRole('button', { name: 'Generate pairings', exact: true }).click()
  await page.getByRole('button', { name: 'Copy pairings', exact: true }).click()
  await expect(page.getByText('Pairings copied to clipboard', { exact: true })).toBeVisible()
})

test('[A8] deleting "Alice" removes her row and shows "2 participants"', async ({ page }) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await addParticipant(page, 'Bob')
  await addParticipant(page, 'Carol')
  await page.getByRole('button', { name: 'Delete Alice', exact: true }).click()
  await expect(page.getByRole('row', { name: /Alice/ })).toHaveCount(0)
  await expect(page.getByRole('row', { name: /Bob/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Carol/ })).toBeVisible()
  await expect(page.getByText('2 participants', { exact: true })).toBeVisible()
})

test('[A9] reload keeps the participants and the "3 participants" count', async ({ page }) => {
  await page.goto('/')
  await addParticipant(page, 'Alice')
  await addParticipant(page, 'Bob')
  await addParticipant(page, 'Carol')
  await page.reload()
  await expect(page.getByRole('row', { name: /Alice/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Bob/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /Carol/ })).toBeVisible()
  await expect(page.getByText('3 participants', { exact: true })).toBeVisible()
})
