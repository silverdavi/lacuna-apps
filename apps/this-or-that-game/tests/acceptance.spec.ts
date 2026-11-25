import { expect, test, type Page } from '@playwright/test'

const question = (page: Page) => page.getByRole('region', { name: 'Question' })

const option = (page: Page, name: string) => question(page).getByRole('button', { name })

const score = (page: Page, n: number) => page.getByText(`Score: ${n}`, { exact: true })

const best = (page: Page, n: number) => page.getByText(`Best score: ${n}`, { exact: true })

const results = (page: Page) => page.getByRole('tab', { name: 'Results' })

// Answer every question with its first option, which per the spec are:
// Coffee, Cats, Beach, Books, Summer.
async function answerAll(page: Page) {
  const picks = ['Coffee', 'Cats', 'Beach', 'Books', 'Summer']
  for (const pick of picks) {
    await option(page, pick).click()
    await page.getByRole('button', { name: 'Next question' }).click()
  }
}

test('[A1] load shows the heading and "No answers yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'This Or That' })).toBeVisible()
  await expect(page.getByText('No answers yet')).toBeVisible()
})

test('[A2] "Start game" shows the first question card', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await expect(question(page)).toContainText('Coffee or Tea?')
  await expect(option(page, 'Coffee')).toBeVisible()
  await expect(option(page, 'Tea')).toBeVisible()
})

test('[A3] picking "Coffee" shows the feedback and "Next question"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await option(page, 'Coffee').click()
  await expect(page.getByText('You picked Coffee')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next question' })).toBeVisible()
})

test('[A4] "Next question" shows the second card and Score: 1', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await option(page, 'Coffee').click()
  await page.getByRole('button', { name: 'Next question' }).click()
  await expect(question(page)).toContainText('Cats or Dogs?')
  await expect(score(page, 1)).toBeVisible()
})

test('[A5] a full session ends with Score: 5 and a visible "Restart"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await answerAll(page)
  await expect(score(page, 5)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
})

test('[A6] "Restart" resets the score, shows the first card, and hides "No answers yet"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await answerAll(page)
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(score(page, 0)).toBeVisible()
  await expect(question(page)).toContainText('Coffee or Tea?')
  await expect(page.getByText('No answers yet')).toHaveCount(0)
})

test('[A7] completing a session of 5 shows "Best score: 5"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await answerAll(page)
  await expect(best(page, 5)).toBeVisible()
})

test('[A8] the "Results" tab shows one row per answered question', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await answerAll(page)
  await results(page).click()
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  const expected = [
    ['Coffee or Tea?', 'Coffee', '1'],
    ['Cats or Dogs?', 'Cats', '1'],
    ['Beach or Mountains?', 'Beach', '1'],
    ['Books or Movies?', 'Books', '1'],
    ['Summer or Winter?', 'Summer', '1'],
  ]
  for (const [q, choice, points] of expected) {
    const row = table.getByRole('row').filter({ hasText: q })
    await expect(row).toContainText(choice)
    await expect(row).toContainText(points)
  }
})

test('[A9] reload keeps the completed answers in the Results tab', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await answerAll(page)
  await page.reload()
  await results(page).click()
  const row = page.getByRole('table').getByRole('row').filter({ hasText: 'Coffee or Tea?' })
  await expect(row).toContainText('Coffee')
})
