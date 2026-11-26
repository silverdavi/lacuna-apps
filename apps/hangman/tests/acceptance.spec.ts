import { expect, test, type Page } from '@playwright/test'

const slot = (page: Page, n: number) => page.getByLabel(`Slot ${n}`, { exact: true })

const lives = (page: Page, n: number) => page.getByText(`Lives: ${n}`, { exact: true })

const score = (page: Page, n: number) => page.getByText(`Score: ${n}`, { exact: true })

const best = (page: Page, n: number) => page.getByText(`Best: ${n}`, { exact: true })

const letter = (page: Page, l: string) => page.getByRole('button', { name: l, exact: true })

async function startGame(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start Game' }).click()
}

async function slotsAllUnderscores(page: Page, count: number) {
  for (let n = 1; n <= count; n++) {
    await expect(slot(page, n)).toHaveText('_')
  }
}

async function winWithCat(page: Page) {
  await startGame(page)
  for (const l of ['C', 'A', 'T']) {
    await letter(page, l).click()
  }
}

test('[A1] on load the heading, Best: 0, Score: 0 and the Start Game button are shown', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hangman Game' })).toBeVisible()
  await expect(best(page, 0)).toBeVisible()
  await expect(score(page, 0)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Game' })).toBeVisible()
})

test('[A2] starting a game shows six empty slots, Lives: 6 and the A through Z keyboard', async ({ page }) => {
  await startGame(page)
  await slotsAllUnderscores(page, 6)
  await expect(lives(page, 6)).toBeVisible()
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (const l of alphabet) {
    await expect(letter(page, l)).toBeVisible()
  }
})

test('[A3] a correct letter fills its slot and keeps Lives: 6', async ({ page }) => {
  await startGame(page)
  await letter(page, 'C').click()
  await expect(slot(page, 1)).toHaveText('C')
  await expect(slot(page, 2)).toHaveText('_')
  await expect(slot(page, 3)).toHaveText('_')
  await expect(lives(page, 6)).toBeVisible()
})

test('[A4] a wrong letter lowers Lives to 5 and is listed under missed letters', async ({ page }) => {
  await startGame(page)
  await letter(page, 'X').click()
  await expect(lives(page, 5)).toBeVisible()
  await expect(page.getByText('X', { exact: true })).toBeVisible()
})

test('[A5] revealing every letter wins and shows Score: 1', async ({ page }) => {
  await winWithCat(page)
  await expect(slot(page, 1)).toHaveText('C')
  await expect(slot(page, 2)).toHaveText('A')
  await expect(slot(page, 3)).toHaveText('T')
  await expect(page.getByText('You win!')).toBeVisible()
  await expect(score(page, 1)).toBeVisible()
})

test('[A6] six wrong letters lose the game and reveal the word', async ({ page }) => {
  await startGame(page)
  for (const l of ['X', 'Y', 'Z', 'Q', 'W', 'E']) {
    await letter(page, l).click()
  }
  await expect(page.getByText('You lose!')).toBeVisible()
  await expect(page.getByText('The word was CAT')).toBeVisible()
  await expect(score(page, 0)).toBeVisible()
})

test('[A7] Restart begins a new game with empty slots and Lives: 6, keeping Score: 1', async ({ page }) => {
  await winWithCat(page)
  await expect(score(page, 1)).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await slotsAllUnderscores(page, 6)
  await expect(lives(page, 6)).toBeVisible()
  await expect(score(page, 1)).toBeVisible()
})

test('[A8] after a win a reload keeps Score: 1 and Best: 1', async ({ page }) => {
  await winWithCat(page)
  await expect(score(page, 1)).toBeVisible()
  await page.reload()
  await expect(score(page, 1)).toBeVisible()
  await expect(best(page, 1)).toBeVisible()
})

test('[A9] after a win a reload keeps Best: 1', async ({ page }) => {
  await winWithCat(page)
  await page.reload()
  await expect(best(page, 1)).toBeVisible()
})
