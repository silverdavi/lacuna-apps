import { expect, test } from '@playwright/test'

test('[A1] first load shows heading, "No rounds yet", and Score: 0', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Rock Paper Scissors' })).toBeVisible()
  await expect(page.getByText('No rounds yet')).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A2] empty Seed, Rock vs Rock is a Draw with Score: 0', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Rock' }).click()
  await expect(page.getByText('You: Rock')).toBeVisible()
  // The computer's choice is "Rock", "Paper" or "Scissors" and the result is "Draw",
  // so the computer must have played "Rock".
  await expect(page.getByText('Rock')).toBeVisible()
  await expect(page.getByText('Draw')).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A3] Seed 42, Rock beats the computer\'s Scissors for a Win, Score: 1', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Rock' }).click()
  await expect(page.getByText('You: Rock')).toBeVisible()
  await expect(page.getByText('Scissors')).toBeVisible()
  await expect(page.getByText('Win')).toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A4] Seed 42, after the first round Paper beats the computer\'s Rock for a Win, Score: 2', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Rock' }).click()
  await page.getByRole('button', { name: 'Paper' }).click()
  await expect(page.getByText('You: Paper')).toBeVisible()
  await expect(page.getByText('Rock')).toBeVisible()
  await expect(page.getByText('Win')).toBeVisible()
  await expect(page.getByText('Score: 2')).toBeVisible()
})

test('[A5] Seed 7, Scissors loses to the computer\'s Rock, Score: 0', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('7')
  await page.getByRole('button', { name: 'Scissors' }).click()
  await expect(page.getByText('You: Scissors')).toBeVisible()
  await expect(page.getByText('Rock')).toBeVisible()
  await expect(page.getByText('Lose')).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A6] after a round, the History tab shows the played row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Rock' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('table').getByText('Rock')).toBeVisible()
  await expect(page.getByRole('table').getByText('Scissors')).toBeVisible()
  await expect(page.getByRole('table').getByText('Win')).toBeVisible()
})

test('[A7] Copy score shows the "Score copied" toast', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Copy score' }).click()
  await expect(page.getByText('Score copied')).toBeVisible()
})

test('[A8] Restart clears the display, shows "No rounds yet", and resets Score: 0', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Rock' }).click()
  await page.getByRole('button', { name: 'Paper' }).click()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('You: Paper', { exact: true })).not.toBeVisible()
  await expect(page.getByText('No rounds yet')).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A9] reload keeps the best score', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'Rock' }).click()
  await page.reload()
  await expect(page.getByText('Best: 1')).toBeVisible()
})
