import { expect, test, type Page } from '@playwright/test'

async function addNames(page: Page, names: string[]) {
  const nameField = page.getByLabel('Name')
  for (const name of names) {
    await nameField.fill(name)
    await nameField.press('Enter')
  }
}

// Names inside a team section: the section text minus its "Team N" heading,
// split on newlines or commas so either layout reads the same way.
async function teamNames(page: Page, team: string): Promise<string[]> {
  const text = await page.getByRole('heading', { name: team }).locator('xpath=..').innerText()
  return text
    .replace(new RegExp(`^${team}\\b`, 'm'), '')
    .split(/[\n,]+/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

test('[A1] heading and empty state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Random Team Generator' })).toBeVisible()
  await expect(page.getByText('No names yet')).toBeVisible()
})

test('[A2] adding a name creates a tag and clears the empty state', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Name').fill('Alice')
  await page.getByLabel('Name').press('Enter')
  await expect(page.getByText('Alice')).toBeVisible()
  await expect(page.getByText('No names yet')).toHaveCount(0)
})

test('[A3] three names split across two teams', async ({ page }) => {
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol'])
  await page.getByLabel('Number of teams').fill('2')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  await expect(page.getByRole('heading', { name: 'Team 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Team 2' })).toBeVisible()
  const seen = [
    ...(await teamNames(page, 'Team 1')),
    ...(await teamNames(page, 'Team 2')),
  ]
  expect(seen.sort()).toEqual(['Alice', 'Bob', 'Carol'].sort())
})

test('[A4] four names split evenly across two teams', async ({ page }) => {
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol', 'Dave'])
  await page.getByLabel('Number of teams').fill('2')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  await expect(page.getByRole('heading', { name: 'Team 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Team 2' })).toBeVisible()
  expect((await teamNames(page, 'Team 1')).length).toBe(2)
  expect((await teamNames(page, 'Team 2')).length).toBe(2)
})

test('[A5] four names across three teams differ by at most one', async ({ page }) => {
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol', 'Dave'])
  await page.getByLabel('Number of teams').fill('3')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  await expect(page.getByRole('heading', { name: 'Team 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Team 2' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Team 3' })).toBeVisible()
  const sizes = [
    (await teamNames(page, 'Team 1')).length,
    (await teamNames(page, 'Team 2')).length,
    (await teamNames(page, 'Team 3')).length,
  ]
  expect(sizes.sort((a, b) => a - b)).toEqual([1, 1, 2])
})

test('[A6] generating twice yields the same teams', async ({ page }) => {
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol', 'Dave'])
  await page.getByLabel('Number of teams').fill('2')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  const first = [
    await teamNames(page, 'Team 1'),
    await teamNames(page, 'Team 2'),
  ]
  await page.getByRole('button', { name: 'Generate teams' }).click()
  const second = [
    await teamNames(page, 'Team 1'),
    await teamNames(page, 'Team 2'),
  ]
  expect(second[0].sort()).toEqual(first[0].sort())
  expect(second[1].sort()).toEqual(first[1].sort())
})

test('[A7] copy result copies one line per team', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol'])
  await page.getByLabel('Number of teams').fill('2')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  const lines = clipboard.split('\n').filter((line) => line.trim() !== '')
  expect(lines.length).toBe(2)
  const t1 = await teamNames(page, 'Team 1')
  const t2 = await teamNames(page, 'Team 2')
  expect(lines[0]).toBe(`Team 1: ${t1.join(', ')}`)
  expect(lines[1]).toBe(`Team 2: ${t2.join(', ')}`)
})

test('[A8] removing a tag excludes that name from the next generation', async ({ page }) => {
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol'])
  await page.getByRole('button', { name: /x/i, exact: true }).click()
  await expect(page.getByText('Alice', { exact: true })).toHaveCount(0)
  await page.getByLabel('Number of teams').fill('2')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  const seen = [
    ...(await teamNames(page, 'Team 1')),
    ...(await teamNames(page, 'Team 2')),
  ]
  expect(seen.sort()).toEqual(['Bob', 'Carol'].sort())
})

test('[A9] generated teams persist across a reload', async ({ page }) => {
  await page.goto('/')
  await addNames(page, ['Alice', 'Bob', 'Carol', 'Dave'])
  await page.getByLabel('Number of teams').fill('2')
  await page.getByRole('button', { name: 'Generate teams' }).click()
  const before = [
    await teamNames(page, 'Team 1'),
    await teamNames(page, 'Team 2'),
  ]
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Team 1' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Team 2' })).toBeVisible()
  const after = [
    await teamNames(page, 'Team 1'),
    await teamNames(page, 'Team 2'),
  ]
  expect(after[0].sort()).toEqual(before[0].sort())
  expect(after[1].sort()).toEqual(before[1].sort())
})
