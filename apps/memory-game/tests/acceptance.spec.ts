import { expect, test, type Page } from '@playwright/test'

const card = (page: Page, n: number) => page.getByRole('button', { name: `Card ${n}`, exact: true })

const score = (page: Page, n: number) => page.getByText(`Score: ${n}`, { exact: true })

const best = (page: Page, n: number) => page.getByText(`Best: ${n}`, { exact: true })

async function allCardsFaceDown(page: Page) {
  for (let n = 1; n <= 16; n++) {
    await expect(card(page, n)).toHaveText('?')
  }
}

async function matchA(page: Page) {
  // Layout is fixed: Card 1 and Card 16 are both "A".
  await card(page, 1).click()
  await card(page, 16).click()
  await expect(card(page, 1)).toHaveText('A')
  await expect(card(page, 16)).toHaveText('A')
  await expect(score(page, 1)).toBeVisible()
  await expect(best(page, 1)).toBeVisible()
}

test('[A1] load shows heading, 16 face-down cards, Score: 0 and Best: 0', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Card Memory Match' })).toBeVisible()
  await allCardsFaceDown(page)
  await expect(score(page, 0)).toBeVisible()
  await expect(best(page, 0)).toBeVisible()
})

test('[A2] clicking Card 1 shows A while Card 2 stays face down and Score stays 0', async ({ page }) => {
  await page.goto('/')
  await card(page, 1).click()
  await expect(card(page, 1)).toHaveText('A')
  await expect(card(page, 2)).toHaveText('?')
  await expect(score(page, 0)).toBeVisible()
})

test('[A3] mismatched Card 1 and Card 2 flip back to ? within 3 seconds, Score stays 0', async ({ page }) => {
  await page.goto('/')
  await card(page, 1).click()
  await card(page, 2).click()
  await expect(card(page, 1)).toHaveText('A')
  await expect(card(page, 2)).toHaveText('B')
  await expect(card(page, 1)).toHaveText('?', { timeout: 3000 })
  await expect(card(page, 2)).toHaveText('?', { timeout: 3000 })
  await expect(score(page, 0)).toBeVisible()
})

test('[A4] matching Card 1 and Card 16 keeps both showing A with Score: 1 and Best: 1', async ({ page }) => {
  await page.goto('/')
  await matchA(page)
})

test('[A5] clicking Card 1 twice does nothing, then Card 16 matches for Score: 1', async ({ page }) => {
  await page.goto('/')
  await card(page, 1).click()
  await card(page, 1).click()
  await expect(card(page, 1)).toHaveText('A')
  await expect(score(page, 0)).toBeVisible()
  await card(page, 16).click()
  await expect(score(page, 1)).toBeVisible()
})

test('[A6] after a match, Restart flips all cards back and resets Score but keeps Best', async ({ page }) => {
  await page.goto('/')
  await matchA(page)
  await page.getByRole('button', { name: 'Restart' }).click()
  await allCardsFaceDown(page)
  await expect(score(page, 0)).toBeVisible()
  await expect(best(page, 1)).toBeVisible()
})

test('[A7] after a match, pressing r on the heading restarts and keeps Best', async ({ page }) => {
  await page.goto('/')
  await matchA(page)
  await page.getByRole('heading', { name: 'Card Memory Match' }).click()
  await page.keyboard.press('r')
  await allCardsFaceDown(page)
  await expect(score(page, 0)).toBeVisible()
  await expect(best(page, 1)).toBeVisible()
})

test('[A8] reload keeps a matched pair: Card 1 and Card 16 show A, Score: 1 and Best: 1', async ({ page }) => {
  await page.goto('/')
  await matchA(page)
  await page.reload()
  await expect(card(page, 1)).toHaveText('A')
  await expect(card(page, 16)).toHaveText('A')
  await expect(card(page, 2)).toHaveText('?')
  await expect(score(page, 1)).toBeVisible()
  await expect(best(page, 1)).toBeVisible()
})

test('[A9] reload after a restart keeps Score: 0 but Best: 1', async ({ page }) => {
  await page.goto('/')
  await matchA(page)
  await page.getByRole('button', { name: 'Restart' }).click()
  await page.reload()
  await expect(score(page, 0)).toBeVisible()
  await expect(best(page, 1)).toBeVisible()
})
