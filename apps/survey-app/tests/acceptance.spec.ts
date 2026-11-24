import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

const card = (page: Page, title = 'Customer Feedback') => page.getByText(title).locator('..')

async function createSurvey(page: Page, title: string) {
  await page.getByRole('button', { name: 'New survey' }).click()
  await page.getByLabel('Title').fill(title)
  await page.getByRole('button', { name: 'Save survey' }).click()
}

async function addQuestion(page: Page, text: string) {
  await page.getByRole('button', { name: 'Add question' }).click()
  const input = page.getByRole('textbox', { name: 'Question' })
  await input.fill(text)
  await page.getByRole('button', { name: 'Add' }).click()
}

// [A1]
test('[A1] empty state shows heading and "No surveys yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Survey App' })).toBeVisible()
  await expect(page.getByText('No surveys yet')).toBeVisible()
})

// [A2]
test('[A2] saving a new survey replaces the empty state', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await expect(page.getByText('Customer Feedback')).toBeVisible()
  await expect(page.getByText('0 responses')).toBeVisible()
  await expect(page.getByText('No surveys yet')).not.toBeVisible()
})

// [A3]
test('[A3] adding two questions makes the card show "2 questions"', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, 'Would you recommend us?')
  await addQuestion(page, 'What did you like?')
  await expect(page.getByText('Would you recommend us?')).toBeVisible()
  await expect(page.getByText('What did you like?')).toBeVisible()
  await expect(page.getByText('2 questions')).toBeVisible()
})

// [A4]
test('[A4] submitting one checked response shows "1 response"', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, 'Would you recommend us?')
  await addQuestion(page, 'What did you like?')
  await page.getByRole('button', { name: 'Start collecting' }).click()
  await expect(page.getByRole('heading', { name: 'Customer Feedback' })).toBeVisible()
  const first = page.getByLabel('Would you recommend us?')
  const second = page.getByLabel('What did you like?')
  await expect(first).toBeVisible()
  await expect(second).toBeVisible()
  await first.check()
  await expect(first).toBeChecked()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await expect(page.getByText('1 response')).toBeVisible()
})

// [A5]
test('[A5] responses table has the question columns and first row', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, 'Would you recommend us?')
  await addQuestion(page, 'What did you like?')
  await page.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByLabel('Would you recommend us?').check()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await page.getByRole('button', { name: 'View responses' }).click()
  const table = page.getByRole('table')
  await expect(table.getByRole('columnheader', { name: 'Respondent' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Would you recommend us?' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'What did you like?' })).toBeVisible()
  const firstRow = table.getByRole('row').filter({ hasText: 'Respondent 1' })
  await expect(firstRow.getByRole('cell', { name: 'Yes' })).toBeVisible()
  await expect(firstRow.getByRole('cell', { name: 'No' })).toBeVisible()
})

// [A6]
test('[A6] CSV export contains the header and data rows', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, 'Would you recommend us?')
  await addQuestion(page, 'What did you like?')
  await page.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByLabel('Would you recommend us?').check()
  await page.getByRole('button', { name: 'Submit response' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export CSV' }).click(),
  ])
  const content = readFileSync(await download.path(), 'utf8')
  expect(content).toContain('Respondent,Would you recommend us?,What did you like?')
  expect(content).toContain('Respondent 1,Yes,No')
})

// [A7]
test('[A7] deleting the survey brings back the empty state', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await page.getByRole('button', { name: 'Delete survey' }).click()
  await expect(page.getByText('Customer Feedback')).not.toBeVisible()
  await expect(page.getByText('No surveys yet')).toBeVisible()
})

// [A8]
test('[A8] a single-question survey collects a response', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'NPS Score')
  await addQuestion(page, 'Rate us 1-10')
  await page.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByLabel('Rate us 1-10').check()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await expect(page.getByText('1 response')).toBeVisible()
  await page.getByRole('button', { name: 'View responses' }).click()
  const table = page.getByRole('table')
  const firstRow = table.getByRole('row').filter({ hasText: 'Respondent 1' })
  await expect(firstRow.getByRole('cell', { name: 'Yes' })).toBeVisible()
})

// [A9]
test('[A9] reload keeps the survey, its questions and response count', async ({ page }) => {
  await page.goto('/')
  await createSurvey(page, 'Customer Feedback')
  await addQuestion(page, 'Would you recommend us?')
  await addQuestion(page, 'What did you like?')
  await page.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByLabel('Would you recommend us?').check()
  await page.getByRole('button', { name: 'Submit response' }).click()
  await page.goto('/')
  await expect(page.getByText('Customer Feedback')).toBeVisible()
  await expect(page.getByText('Would you recommend us?')).toBeVisible()
  await expect(page.getByText('What did you like?')).toBeVisible()
  await expect(page.getByText('1 response')).toBeVisible()
})
