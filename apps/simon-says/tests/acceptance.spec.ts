import { expect, test, type Page } from '@playwright/test'

const pad = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const score = (page: Page, n: number) => page.getByText(`Score: ${n}`, { exact: true })

async function completeRound(page: Page) {
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Start' }).click()
  // Seed "42" sequence: 4 pads, then 5 pads (Red, Blue, Green, Yellow, Red).
  for (const p of ['Red', 'Blue', 'Green', 'Yellow']) await pad(page, p).click()
  await expect(score(page, 1)).toBeVisible()
  for (const p of ['Red', 'Blue', 'Green', 'Yellow', 'Red']) await pad(page, p).click()
  await expect(score(page, 2)).toBeVisible()
}

test('[A1] initial load shows heading, "Press Start to begin", and "Score: 0"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Simon Says Game' })).toBeVisible()
  await expect(page.getByText('Press Start to begin')).toBeVisible()
  await expect(score(page, 0)).toBeVisible()
})

test('[A2] seed 42 and Start plays exactly 4 pads and enables the pads for input', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Start' }).click()
  // The first sequence plays exactly 4 pads; waiting for the pads to become
  // enabled for input doubles as the signal that the 4-pad sequence has ended.
  await expect(pad(page, 'Red')).toBeEnabled()
  await expect(pad(page, 'Blue')).toBeEnabled()
  await expect(pad(page, 'Green')).toBeEnabled()
  await expect(pad(page, 'Yellow')).toBeEnabled()
  await expect(score(page, 0)).toBeVisible()
})

test('[A3] with seed 42, completing Red Blue Green Yellow advances to Score: 1 and plays exactly 5 pads', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(pad(page, 'Red')).toBeEnabled()
  for (const p of ['Red', 'Blue', 'Green', 'Yellow']) await pad(page, p).click()
  await expect(score(page, 1)).toBeVisible()
  // The next sequence plays exactly 5 pads; waiting for the pads to re-enable
  // after the second click doubles as the signal that it has finished.
  await expect(pad(page, 'Red')).toBeEnabled()
})

test('[A4] with seed 42, clicking Blue first when the sequence starts with Red shows "Wrong pad" and keeps Score: 0', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(pad(page, 'Red')).toBeEnabled()
  await pad(page, 'Blue').click()
  await expect(page.getByText('Wrong pad')).toBeVisible()
  await expect(score(page, 0)).toBeVisible()
})

test('[A5] after Score: 1, Restart resets to Score: 0, clears the message, and shows "Press Start to begin"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Start' }).click()
  await expect(pad(page, 'Red')).toBeEnabled()
  for (const p of ['Red', 'Blue', 'Green', 'Yellow']) await pad(page, p).click()
  await expect(score(page, 1)).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(score(page, 0)).toBeVisible()
  await expect(page.getByText('Wrong pad')).toHaveCount(0)
  await expect(page.getByText('Press Start to begin')).toBeVisible()
})

test('[A6] with seed 42, completing both sequences advances to Score: 2', async ({ page }) => {
  await page.goto('/')
  await completeRound(page)
})

test('[A7] the History tab shows a "Best Score" header and a row with "42" and "2" after a round', async ({ page }) => {
  await page.goto('/')
  await completeRound(page)
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('columnheader', { name: 'Best Score' })).toBeVisible()
  const row = page.getByRole('row').filter({ hasText: '42' }).filter({ hasText: '2' })
  await expect(row).toBeVisible()
})

test('[A8] "Copy best" in the History tab shows "Best score copied" and puts "Best score: 2" on the clipboard', async ({ page, context }) => {
  await page.goto('/')
  await completeRound(page)
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Copy best' }).click()
  await expect(page.getByText('Best score copied')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the best score').toBe('Best score: 2')
})

test('[A9] reload keeps the best score: "Best Score: 2" shows in the History tab after a round with seed 42', async ({ page }) => {
  await page.goto('/')
  await completeRound(page)
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('Best Score: 2')).toBeVisible()
})
