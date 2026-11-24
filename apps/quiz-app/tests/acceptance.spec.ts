import { expect, test } from '@playwright/test'

// Adds the "What is 2+2?" question used across the acceptance checks.
async function addQuestion(page: import('@playwright/test').Page) {
  await page.getByLabel('Question').fill('What is 2+2?')
  await page.getByLabel('Type').selectOption('Multiple choice')
  await page.getByLabel('Option A').fill('4')
  await page.getByLabel('Option B').fill('3')
  await page.getByLabel('Option C').fill('5')
  await page.getByLabel('Option D').fill('6')
  await page.getByLabel('Correct answer').selectOption('A')
  await page.getByRole('button', { name: 'Save question' }).click()
}

test('[A1] page shows the heading and both tab labels', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Quiz App' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Questions' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Study' })).toBeVisible()
})

test('[A2] saving a multiple choice question adds it to the list', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  const item = page.getByText('What is 2+2?').first()
  await expect(item).toBeVisible()
  await expect(item.locator('xpath=ancestor::li[1]')).toContainText('Multiple choice')
})

test('[A3] study tab shows the question count and start button', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Study' }).click()
  await expect(page.getByText('1 question ready')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start session' })).toBeVisible()
})

test('[A4] start session shows the question, four option buttons, and next', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await expect(page.getByText('What is 2+2?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'A: 4' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'B: 3' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'C: 5' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'D: 6' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
})

test('[A5] answering incorrectly shows the feedback and the correct answer', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: 'B: 3' }).click()
  await expect(page.getByText('Incorrect')).toBeVisible()
  await expect(page.getByText('A: 4')).toBeVisible()
})

test('[A6] next after answering shows the score summary and review button', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: 'B: 3' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Score: 0/1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review mistakes' })).toBeVisible()
})

test('[A7] review mistakes lists the question and the given answer', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: 'B: 3' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Review mistakes' }).click()
  const list = page.getByText('What is 2+2?').first()
  await expect(list).toBeVisible()
  await expect(list.locator('xpath=ancestor::li[1]')).toContainText('Your answer: B: 3')
})

test('[A8] delete removes the question and shows the empty state', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Delete What is 2+2?' }).click()
  await expect(page.getByText('What is 2+2?')).toHaveCount(0)
  await expect(page.getByText('No questions yet')).toBeVisible()
})

test('[A9] reload keeps the question on the questions tab', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.reload()
  await expect(page.getByText('What is 2+2?')).toBeVisible()
})
