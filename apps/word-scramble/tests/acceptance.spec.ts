import { expect, test, type Page } from '@playwright/test'

const toast = (page: Page, text: string) =>
  page
    .getByText(text)
    .or(page.getByRole('status').getByText(text))
    .or(page.getByRole('alert').getByText(text))

async function startRound(page: Page) {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByLabel('Difficulty').selectOption('Easy')
  await page.getByRole('button', { name: 'Start round' }).click()
}

test('[A1] on load the heading, No active round and Score: 0 are shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Word Scramble Game' })).toBeVisible()
  await expect(page.getByText('No active round')).toBeVisible()
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
})

test('[A2] starting a round shows Round started, the timer and the scrambled word', async ({ page }) => {
  await startRound(page)
  await expect(page.getByText('Round started')).toBeVisible()
  await expect(page.getByText('00:30', { exact: true })).toBeVisible()
  await expect(page.getByText('ELP', { exact: true })).toBeVisible()
})

test('[A3] a correct answer shows the toast, adds 10 points and shows the next word', async ({ page }) => {
  await startRound(page)
  await page.getByLabel('Answer').fill('HELP')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(toast(page, 'Correct! +10 points').first()).toBeVisible()
  await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  await expect(page.getByText('WORLD', { exact: true })).toBeVisible()
})

test('[A4] an incorrect answer shows the toast, keeps Score: 0 and keeps the word', async ({ page }) => {
  await startRound(page)
  await page.getByLabel('Answer').fill('HELQ')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(toast(page, 'Incorrect').first()).toBeVisible()
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  await expect(page.getByText('ELP', { exact: true })).toBeVisible()
})

test('[A5] pausing renames the button to Resume and stops the timer', async ({ page }) => {
  await startRound(page)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.getByLabel('Answer').fill('HELQ')
  await page.getByRole('button', { name: 'Submit' }).click()
  const first = (await page.getByText(/^00:\d\d$/, { exact: true }).first().innerText()).trim()
  await page.getByLabel('Answer').fill('HELQ')
  await page.getByRole('button', { name: 'Submit' }).click()
  const second = (await page.getByText(/^00:\d\d$/, { exact: true }).first().innerText()).trim()
  expect(second, 'timer does not run while paused').toBe(first)
})

test('[A6] giving up ends the round, shows the final score and updates the best', async ({ page }) => {
  await startRound(page)
  await page.getByRole('button', { name: 'Give up' }).click()
  await expect(toast(page, 'Round over').first()).toBeVisible()
  await expect(page.getByText('Final score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0', { exact: true })).toBeVisible()
})

test('[A7] after solving a word, a reload keeps the round, the next word and the score', async ({ page }) => {
  await startRound(page)
  await page.getByLabel('Answer').fill('HELP')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Round started')).toBeVisible()
  await expect(page.getByText('WORLD', { exact: true })).toBeVisible()
  await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
})

test('[A8] restarting ends the round, resets the score and keeps the best', async ({ page }) => {
  await startRound(page)
  await page.getByLabel('Answer').fill('HELP')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Score: 10', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('No active round')).toBeVisible()
  await expect(page.getByText('Score: 0', { exact: true })).toBeVisible()
  await expect(page.getByText('Best: 10', { exact: true })).toBeVisible()
})
