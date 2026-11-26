import { expect, test, type Locator, type Page } from '@playwright/test'

const pile = (page: Page, name: string): Locator => page.getByRole('group', { name })

async function deal(page: Page) {
  await page.getByRole('button', { name: 'New Game' }).click()
}

// Deals and draws one card from the stock into the waste, which for a seeded shuffle is the King of Spades.
async function kingToWaste(page: Page) {
  await deal(page)
  const stock = pile(page, 'Stock')
  await stock.focus()
  await stock.press('ArrowRight')
}

// kingToWaste plus moving the King of Spades from the waste onto the first foundation.
async function kingToFirstFoundation(page: Page) {
  await kingToWaste(page)
  const waste = pile(page, 'Waste')
  await waste.focus()
  await waste.press('ArrowDown')
}

test('[A1] initial load shows the heading, Score: 0, Best: 0 and the New Game button', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Solitaire Game' })).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible()
})

test('[A2] clicking New Game deals the board, keeps Score: 0 and shows 24 in the stock', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(pile(page, 'Stock')).toContainText('24')
})

test('[A3] ArrowRight on a focused stock moves the top card to the waste, leaving 23 in the stock', async ({
  page,
}) => {
  await page.goto('/')
  await deal(page)
  const stock = pile(page, 'Stock')
  await stock.focus()
  await stock.press('ArrowRight')
  await expect(stock).toContainText('23')
  await expect(pile(page, 'Waste')).toContainText('K')
})

test('[A4] ArrowDown on a focused waste moves the King of Spades to the first foundation with Score: 10', async ({
  page,
}) => {
  await page.goto('/')
  await kingToWaste(page)
  const waste = pile(page, 'Waste')
  await waste.focus()
  await waste.press('ArrowDown')
  await expect(waste).toBeEmpty()
  await expect(pile(page, 'Foundation 1')).toContainText('K')
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A5] ArrowUp on a focused first foundation returns the King of Spades to the waste with Score: 0', async ({
  page,
}) => {
  await page.goto('/')
  await kingToFirstFoundation(page)
  const foundation = pile(page, 'Foundation 1')
  await foundation.focus()
  await foundation.press('ArrowUp')
  await expect(foundation).toBeEmpty()
  await expect(pile(page, 'Waste')).toContainText('K')
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A6] reloading keeps the King of Spades on the first foundation and Score: 10', async ({ page }) => {
  await page.goto('/')
  await kingToFirstFoundation(page)
  await page.reload()
  await expect(pile(page, 'Foundation 1')).toContainText('K')
  await expect(page.getByText('Score: 10')).toBeVisible()
})

test('[A7] clicking New Game after a move resets the board, the stock shows 24 and Score: 0', async ({ page }) => {
  await page.goto('/')
  await kingToFirstFoundation(page)
  await page.getByRole('button', { name: 'New Game' }).click()
  await expect(pile(page, 'Foundation 1')).toBeEmpty()
  await expect(pile(page, 'Stock')).toContainText('24')
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A8] reloading after Score: 10 still shows Best: 10', async ({ page }) => {
  await page.goto('/')
  await kingToFirstFoundation(page)
  await page.reload()
  await expect(page.getByText('Best: 10')).toBeVisible()
})
