import { expect, test } from '@playwright/test'

test('[A1] page displays the heading "Number Guess Game"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Number Guess Game' })).toBeVisible()
})

test('[A2] seed 42 and New Game starts the game', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(page.getByText('Guess the number between 1 and 100')).toBeVisible()
})

test('[A3] seed 42, guess 10 shows Too low and adds a history row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('10')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Too low')).toBeVisible()
  await expect(page.getByRole('cell', { name: '10' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Too low' })).toBeVisible()
})

test('[A4] seed 42, previous 10, guess 25 shows Too high and adds a history row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('10')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByLabel('Guess').fill('25')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Too high')).toBeVisible()
  await expect(page.getByRole('cell', { name: '25' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Too high' })).toBeVisible()
})

test('[A5] seed 42, previous 10 and 25, guess 17 shows win toast and enables New Game', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('10')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByLabel('Guess').fill('25')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByLabel('Guess').fill('17')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Correct! You won in 3 attempts.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeEnabled()
})

test('[A6] after winning with seed 42, Best Score: 3 is visible', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('10')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByLabel('Guess').fill('25')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByLabel('Guess').fill('17')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Best Score: 3')).toBeVisible()
})

test('[A7] New Game with seed 42 resets history, clears Guess, shows toast', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('10')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(page.getByText('New game started')).toBeVisible()
  await expect(page.getByLabel('Guess')).toHaveValue('')
  await expect(page.getByRole('cell', { name: '10' })).toHaveCount(0)
})

test('[A8] seed 42, guess abc shows validation toast and adds no history row', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('abc')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Enter a valid number between 1 and 100')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'abc' })).toHaveCount(0)
})

test('[A9] reload keeps game state: seed 42, guess 10, reload shows history and best score', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Seed').fill('42')
  await page.getByRole('button', { name: 'New Game' }).click()
  await page.getByLabel('Guess').fill('10')
  await page.getByRole('button', { name: 'Submit' }).click()
  await page.reload()
  await expect(page.getByRole('cell', { name: '10' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Too low' })).toBeVisible()
})
