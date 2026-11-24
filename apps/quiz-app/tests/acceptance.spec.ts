import { expect, test, type Page } from '@playwright/test'

async function addQuestion(page: Page, question: string) {
  await page.getByLabel('Question').fill(question)
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
  await expect(page.getByText('Questions', { exact: true })).toBeVisible()
  await expect(page.getByText('Study', { exact: true })).toBeVisible()
})

test('[A2] saving a multiple-choice question adds a list item with its text and type', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  const item = page.getByRole('listitem').filter({ hasText: 'What is 2+2?' })
  await expect(item).toContainText('Multiple choice')
})

test('[A3] the Study tab shows the ready count and a Start session button', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.getByText('Study', { exact: true }).click()
  await expect(page.getByText('1 question ready')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start session' })).toBeVisible()
})

test('[A4] starting a session shows the question, four option buttons and Next', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.getByText('Study', { exact: true }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await expect(page.getByText('What is 2+2?')).toBeVisible()
  for (const label of ['A: 4', 'B: 3', 'C: 5', 'D: 6']) {
    await expect(page.getByRole('button', { name: label })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
})

test('[A5] clicking the wrong option shows Incorrect and the correct answer', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.getByText('Study', { exact: true }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: 'B: 3' }).click()
  await expect(page.getByRole('button', { name: 'B: 3' })).toHaveCount(0)
  // "A: 4" is a substring of the option button's own name, so match the feedback
  // sentence that shows the correct answer instead.
  await expect(page.getByText(/Correct answer:?\s*A: 4/)).toBeVisible()
  await expect(page.getByText('Incorrect')).toBeVisible()
})

test('[A6] Next after answering shows the session summary with the score', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.getByText('Study', { exact: true }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: 'B: 3' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Score: 0/1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review mistakes' })).toBeVisible()
})

test('[A7] Review mistakes lists the missed question with the given answer', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.getByText('Study', { exact: true }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: 'B: 3' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Review mistakes' }).click()
  // The summary is still in the DOM, so a bare getByText('What is 2+2?') would be
  // ambiguous; assert the review list item carries both the question and the answer.
  const item = page.getByRole('listitem', { name: /What is 2\+2\?/ })
  await expect(item).toBeVisible()
  await expect(item).toContainText('Your answer: B: 3')
})

test('[A8] deleting the question empties the list and shows the empty state', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.getByRole('button', { name: 'Delete What is 2+2?' }).click()
  await expect(page.getByText('What is 2+2?')).toHaveCount(0)
  await expect(page.getByText('No questions yet')).toBeVisible()
})

test('[A9] reload keeps the question on the Questions tab', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page, 'What is 2+2?')
  await page.reload()
  await expect(page.getByRole('listitem').filter({ hasText: 'What is 2+2?' })).toBeVisible()
})
