import { expect, test } from '@playwright/test'

const card = (page) => page.getByText(/^(Heads|Tails)$/).first()
const streak = (page) => page.getByText(/^Streak: /)
const best = (page) => page.getByText(/^Best: /)
const flip = (page) => page.getByRole('button', { name: 'Flip' })
const result = (page) => card(page).innerText()

// Reads the result without changing state, so each flip is observed independently.
async function flipTo(page, side: 'Heads' | 'Tails') {
  for (let i = 0; i < 256; i++) {
    await flip(page).click()
    if ((await result(page)) === side) return
  }
  throw new Error(`never landed on ${side}`)
}

test('[A1] initial load shows the heading, Flip, Tails card and Streak: 0', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Coin Flip' })).toBeVisible()
  await expect(flip(page)).toBeVisible()
  await expect(card(page)).toHaveText('Tails')
  await expect(streak(page)).toHaveText('Streak: 0')
})

test('[A2] one flip shows Heads or Tails and Streak: 1', async ({ page }) => {
  await page.goto('/')
  await flip(page).click()
  await result(page)
  await expect(streak(page)).toHaveText('Streak: 1')
})

test('[A3] a differing result restarts the streak at 1', async ({ page }) => {
  await page.goto('/')
  await flipTo(page, 'Heads')
  await flipTo(page, 'Tails')
  await expect(streak(page)).toHaveText('Streak: 1')
})

test('[A3] a matching result grows the streak to 2', async ({ page }) => {
  await page.goto('/')
  await flipTo(page, 'Heads')
  await flipTo(page, 'Heads')
  await expect(streak(page)).toHaveText('Streak: 2')
})

test('[A4] a streak of 3 shows Best: 3', async ({ page }) => {
  await page.goto('/')
  for (const _ of [0, 1, 2]) await flipTo(page, 'Tails')
  await expect(streak(page)).toHaveText('Streak: 3')
  await expect(best(page)).toHaveText('Best: 3')
})

test('[A5] Reset returns the card, streak and best to their initial values', async ({ page }) => {
  await page.goto('/')
  for (const _ of [0, 1, 2]) await flipTo(page, 'Heads')
  await expect(best(page)).toHaveText('Best: 3')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(streak(page)).toHaveText('Streak: 0')
  await expect(best(page)).toHaveText('Best: 0')
  await expect(card(page)).toHaveText('Tails')
})

test('[A6] Grading a Heads card shows Correct below the card', async ({ page }) => {
  await page.goto('/')
  await flipTo(page, 'Heads')
  await card(page).getByRole('button', { name: 'Grade' }).click()
  await expect(page.getByText('Correct')).toBeVisible()
})

test('[A7] Grading a Tails card shows Incorrect below the card', async ({ page }) => {
  await page.goto('/')
  await flipTo(page, 'Tails')
  await card(page).getByRole('button', { name: 'Grade' }).click()
  await expect(page.getByText('Incorrect')).toBeVisible()
})

test('[A8] the latest result and streak survive a reload', async ({ page }) => {
  await page.goto('/')
  await flipTo(page, 'Heads')
  await expect(streak(page)).toHaveText('Streak: 1')
  await page.reload()
  await expect(card(page)).toHaveText('Heads')
  await expect(streak(page)).toHaveText('Streak: 1')
})
