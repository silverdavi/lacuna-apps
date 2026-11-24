import { expect, test, type Locator, type Page } from '@playwright/test'

// A2's "creates a survey card" is read as a named article per card, so the card
// is located by getByRole('article', { name }) and the spec's text checks assert
// the content that lives inside it.

function surveyCard(page: Page, title: string): Locator {
  return page.getByRole('article', { name: title }).first()
}

async function createSurvey(page: Page, title: string) {
  await page.getByRole('button', { name: 'New survey' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Save survey' }).click()
  return surveyCard(page, title)
}

async function addQuestion(page: Page, card: Locator, text: string) {
  await card.getByRole('button', { name: 'Add question' }).click()
  // The spec fixes only the question wording; the input's accessible name is not
  // specified, so target the newest text input that the Add question button opens.
  await page.getByRole('textbox').last().fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
}

test('[A1] empty app shows the heading and "No surveys yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Survey App' })).toBeVisible()
  await expect(page.getByText('No surveys yet')).toBeVisible()
})

test('[A2] creating a survey shows its card with the title and "0 responses"', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await expect(card).toContainText('Customer Feedback')
  await expect(card).toContainText('0 responses')
  await expect(page.getByText('No surveys yet')).not.toBeVisible()
})

test('[A3] adding two questions shows a checklist item for each and "2 questions"', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, card, 'Would you recommend us?')
  await addQuestion(page, card, 'What did you like?')
  await expect(card.getByText('Would you recommend us?')).toBeVisible()
  await expect(card.getByText('What did you like?')).toBeVisible()
  await expect(card).toContainText('2 questions')
})

test('[A4] Start collecting opens a form with the questions as checkboxes; submitting increments the count', async ({
  page,
}) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, card, 'Would you recommend us?')
  await addQuestion(page, card, 'What did you like?')
  await card.getByRole('button', { name: 'Start collecting' }).click()
  await expect(page.getByRole('heading', { name: 'Customer Feedback' })).toBeVisible()
  const recommend = page.getByRole('checkbox', { name: 'Would you recommend us?' })
  const liked = page.getByRole('checkbox', { name: 'What did you like?' })
  await expect(recommend).toBeVisible()
  await expect(liked).toBeVisible()
  await recommend.click()
  await expect(recommend).toBeChecked()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await expect(card).toContainText('1 response')
})

test('[A5] View responses opens a table with a Respondent column and Yes/No per question', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, card, 'Would you recommend us?')
  await addQuestion(page, card, 'What did you like?')
  await card.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByRole('checkbox', { name: 'Would you recommend us?' }).click()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await card.getByRole('button', { name: 'View responses' }).click()
  const table = page.getByRole('table').last()
  await expect(table.getByRole('columnheader', { name: 'Respondent' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Would you recommend us?' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'What did you like?' })).toBeVisible()
  const row = table.locator('tr').filter({ hasText: 'Respondent 1' })
  await expect(row).toContainText('Yes')
  await expect(row).toContainText('No')
})

test('[A6] Export CSV downloads a file with the header row and the response row', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, card, 'Would you recommend us?')
  await addQuestion(page, card, 'What did you like?')
  await card.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByRole('checkbox', { name: 'Would you recommend us?' }).click()
  await page.getByRole('button', { name: 'Submit response' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    card.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const { readFileSync } = await import('node:fs')
  const content = readFileSync(await download.path(), 'utf8')
  expect(content).toContain('Respondent,Would you recommend us?,What did you like?')
  expect(content).toContain('Respondent 1,Yes,No')
})

test('[A7] Delete survey removes the card and brings back "No surveys yet"', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await card.getByRole('button', { name: 'Delete survey' }).click()
  await expect(card).toHaveCount(0)
  await expect(page.getByText('No surveys yet')).toBeVisible()
})

test('[A8] a single-question survey records a response and shows it in the table', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'NPS Score')
  await addQuestion(page, card, 'Rate us 1-10')
  await card.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByRole('checkbox', { name: 'Rate us 1-10' }).click()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await expect(card).toContainText('1 response')
  await card.getByRole('button', { name: 'View responses' }).click()
  const row = page.getByRole('table').last().locator('tr').filter({ hasText: 'Respondent 1' })
  await expect(row).toContainText('Yes')
})

test('[A9] reload keeps the survey, its questions and its response count', async ({ page }) => {
  await page.goto('/')
  const card = await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, card, 'Would you recommend us?')
  await addQuestion(page, card, 'What did you like?')
  await card.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByRole('checkbox', { name: 'Would you recommend us?' }).click()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await expect(card).toContainText('1 response')
  await page.reload()
  const card2 = surveyCard(page, 'Customer Feedback')
  await expect(card2).toContainText('Would you recommend us?')
  await expect(card2).toContainText('What did you like?')
  await expect(card2).toContainText('1 response')
})
