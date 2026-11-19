import { expect, test, type Locator, type Page } from '@playwright/test'

function cards(page: Page): Locator {
  return page.getByRole('button').filter({ has: page.locator('text=/^[A-H]$/') })
}

async function flip(page: Page, index: number) {
  await cards(page).nth(index).click()
}

test('[A1] initial load shows heading, 16 face-down cards and zero scores', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Card Memory Match' })).toBeVisible()
  const grid = cards(page)
  await expect(grid).toHaveCount(16)
  await expect(grid.first()).toBeHidden()
  for (let i = 0; i < 16; i++) {
    await expect(grid.nth(i), `card ${i} is face-down`).toBeHidden()
  }
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
})

test('[A2] flipping the top-left card shows A and leaves the score unchanged', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  const card = cards(page).first()
  await expect(card).toBeVisible()
  await expect(card).toHaveText('A')
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A3] a mismatched second flip turns both cards back down after 1 second', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  const first = cards(page).first()
  await expect(first).toBeVisible()
  await expect(first).toHaveText('A')
  await flip(page, 1)
  const second = cards(page).nth(1)
  await expect(second).toBeVisible()
  await expect(second).toHaveText('B')
  // spec: both cards flip back to face-down after 1 second. Confirm they stay
  // up while the timer runs and are back down once the 1 second is over.
  await expect(first, 'first card still up before the 1s deadline').toBeVisible()
  await expect(second, 'second card still up before the 1s deadline').toBeVisible()
  await expect(first, 'first card flips back down by the 1s deadline').toBeHidden({ timeout: 1000 })
  await expect(second, 'second card flips back down by the 1s deadline').toBeHidden({ timeout: 1000 })
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A4] a matching second flip keeps both cards up and scores one point', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  const first = cards(page).first()
  await expect(first).toBeVisible()
  await expect(first).toHaveText('A')
  await flip(page, 15)
  const last = cards(page).last()
  await expect(last).toBeVisible()
  await expect(last).toHaveText('A')
  await expect(first, 'matched card stays face-up').toBeVisible()
  await expect(last, 'matched card stays face-up').toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A5] clicking the face-up top-left card again does nothing', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  const first = cards(page).first()
  await expect(first).toBeVisible()
  await expect(first).toHaveText('A')
  await flip(page, 0)
  await expect(first).toBeVisible()
  await expect(first).toHaveText('A')
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A6] the Restart button resets the board and score but keeps the best', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  await flip(page, 15)
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  const grid = cards(page)
  await expect(grid).toHaveCount(16)
  for (let i = 0; i < 16; i++) {
    await expect(grid.nth(i), `card ${i} is face-down after restart`).toBeHidden()
  }
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
})

test('[A7] pressing r resets the board and score but keeps the best', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  await flip(page, 15)
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
  await page.keyboard.press('r')
  const grid = cards(page)
  await expect(grid).toHaveCount(16)
  for (let i = 0; i < 16; i++) {
    await expect(grid.nth(i), `card ${i} is face-down after reset`).toBeHidden()
  }
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
})

test('[A8] a reload keeps the score and the matched pair face-up', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  await flip(page, 15)
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
  const first = cards(page).first()
  await expect(first).toBeVisible()
  await expect(first).toHaveText('A')
  const last = cards(page).last()
  await expect(last).toBeVisible()
  await expect(last).toHaveText('A')
})

test('[A9] a reload keeps the best score and the current score', async ({ page }) => {
  await page.goto('/')
  await flip(page, 0)
  await flip(page, 15)
  await expect(page.getByText('Score: 1')).toBeVisible()
  await expect(page.getByText('Best: 1')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Best: 1')).toBeVisible()
  await expect(page.getByText('Score: 1')).toBeVisible()
})
