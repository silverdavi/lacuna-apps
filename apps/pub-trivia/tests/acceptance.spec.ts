import { expect, test, type Page } from '@playwright/test'

async function startOneCategory(page: Page) {
  await page.getByRole('button', { name: 'None', exact: true }).click()
  await page.getByRole('button', { name: 'Ancient World', exact: true }).click()
  await page.getByRole('button', { name: 'Medium', exact: true }).click()
  await page.getByRole('button', { name: 'Hard', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] first load shows the heading and a Start button', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Pub trivia' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeVisible()
})

test('[A2] one category and tier 1 starts a deck of ten', async ({ page }) => {
  await startOneCategory(page)
  await expect(page.getByText('Card 1 of 10')).toBeVisible()
})

test('[A3] Reveal shows the answer', async ({ page }) => {
  await startOneCategory(page)
  await expect(page.getByText('Answer', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await expect(page.getByText('Answer', { exact: true })).toBeVisible()
})

test('[A4] Got it increments the score and moves on', async ({ page }) => {
  await startOneCategory(page)
  await expect(page.getByText('Score 0')).toBeVisible()
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await page.getByRole('button', { name: 'Got it' }).click()
  await expect(page.getByText('Score 1')).toBeVisible()
  await expect(page.getByText('Card 2 of 10')).toBeVisible()
})

test('[A5] keyboard: Space reveals, G scores, M scores a miss', async ({ page }) => {
  await startOneCategory(page)
  await page.keyboard.press('Space')
  await page.keyboard.press('g')
  await page.keyboard.press('Space')
  await page.keyboard.press('m')
  await expect(page.getByText('Card 3 of 10')).toBeVisible()
  await expect(page.getByText('Score 1')).toBeVisible()
})

test('[A6] finishing the deck shows the summary with missed questions', async ({ page }) => {
  await startOneCategory(page)
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Reveal answer' }).click()
    await page.getByRole('button', { name: 'Missed it' }).click()
  }
  await expect(page.getByText('Deck finished')).toBeVisible()
  await expect(page.getByRole('table', { name: 'Per-category results' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Retry missed' })).toBeEnabled()
  await page.getByRole('button', { name: 'Retry missed' }).click()
  await expect(page.getByText('Card 1 of 10')).toBeVisible()
})

test('[A7] no category selected shows the empty state', async ({ page }) => {
  await page.getByRole('button', { name: 'None', exact: true }).click()
  await expect(page.getByText('Choose at least one category and tier')).toBeVisible()
})

test('[A8] a themed round plays its questions in order', async ({ page }) => {
  await page.getByRole('tab', { name: 'Rounds' }).or(page.getByRole('button', { name: 'Rounds', exact: true })).click()
  await page.getByRole('button', { name: /^Play / }).first().click()
  await expect(page.getByText(/Card 1 of [78]$/)).toBeVisible()
})

test('[A9] Daily shows the same question on reload and keeps the streak', async ({ page }) => {
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  const q = await page.locator('.pt-q').first().innerText()
  await page.reload()
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await expect(page.locator('.pt-q').first()).toHaveText(q)
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await page.getByRole('button', { name: 'Got it' }).click()
  await expect(page.getByText('Come back tomorrow')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Daily', exact: true }).click()
  await expect(page.getByText('Come back tomorrow')).toBeVisible()
  await expect(page.getByText('Day streak')).toBeVisible()
})

test('[A10] stats persist across reload and Reset asks first', async ({ page }) => {
  await startOneCategory(page)
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await page.getByRole('button', { name: 'Got it' }).click()
  await page.reload()
  await page.getByRole('button', { name: 'Stats', exact: true }).click()
  await expect(page.getByRole('table', { name: 'Accuracy by category' })).toContainText('Ancient World')
  await page.getByRole('button', { name: 'Reset stats' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset stats' }).click()
  await expect(page.getByText('Score some cards in Solo mode')).toBeVisible()
})

test('[A11] quizmaster mode awards points to named teams', async ({ page }) => {
  await page.getByRole('button', { name: 'Quizmaster', exact: true }).click()
  await page.getByRole('button', { name: '2', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Reveal answer' }).click()
  await page.getByRole('button', { name: /\+1 Team 1/ }).click()
  await expect(page.getByRole('button', { name: /\+1 Team 1/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Got it' })).toHaveCount(0)
})
