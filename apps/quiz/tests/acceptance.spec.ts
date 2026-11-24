import { expect, test, type Page } from '@playwright/test'

async function addQuestion(page: Page) {
  await page.getByLabel('Question').fill('What is 2+2?')
  await page.getByLabel('Correct answer').fill('4')
  await page.getByLabel('Wrong answer 1').fill('3')
  await page.getByLabel('Wrong answer 2').fill('5')
  await page.getByRole('button', { name: 'Add question' }).click()
}

test('[A1] page heading is "Quiz Maker"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Quiz Maker' })).toBeVisible()
})

test('[A2] adding a question creates a list item with the question and correct answer', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  const item = page.getByRole('listitem').filter({ hasText: 'What is 2+2?' })
  await expect(item).toContainText('4')
})

test('[A3] study tab shows "Start session" and "1 question ready"', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  await expect(page.getByRole('button', { name: 'Start session' })).toBeVisible()
  await expect(page.getByText('1 question ready')).toBeVisible()
})

test('[A4] starting a session shows the question, three answers, and Next', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await expect(page.getByText('What is 2+2?')).toBeVisible()
  await expect(page.getByRole('button', { name: '4' })).toBeVisible()
  await expect(page.getByRole('button', { name: '3' })).toBeVisible()
  await expect(page.getByRole('button', { name: '5' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeVisible()
})

test('[A5] clicking the correct answer shows "Correct" and enables Next', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: '4' }).click()
  await expect(page.getByText('Correct')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Next' })).toBeEnabled()
})

test('[A6] clicking Next after the correct answer shows "Score: 1/1" and "Review"', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: '4' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.getByText('Score: 1/1')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Review' })).toBeVisible()
})

test('[A7] clicking Review shows the question with status "Correct"', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('tab', { name: 'Study' }).click()
  await page.getByRole('button', { name: 'Start session' }).click()
  await page.getByRole('button', { name: '4' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await page.getByRole('button', { name: 'Review' }).click()
  const item = page.getByRole('listitem').filter({ hasText: 'What is 2+2?' })
  await expect(item).toContainText('Correct')
})

test('[A8] deleting the question removes it and shows "No questions yet" on Study', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.getByRole('button', { name: 'Delete What is 2+2?' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'What is 2+2?' })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Study' }).click()
  await expect(page.getByText('No questions yet')).toBeVisible()
})

test('[A9] reload keeps the question in the list', async ({ page }) => {
  await page.goto('/')
  await addQuestion(page)
  await page.reload()
  const item = page.getByRole('listitem').filter({ hasText: 'What is 2+2?' })
  await expect(item).toContainText('4')
})
