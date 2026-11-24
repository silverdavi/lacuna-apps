import { expect, test } from '@playwright/test'

test('questions and responses survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'New survey' }).click()
  await page.getByLabel('Title').fill('Onboarding Pulse')
  await page.getByRole('button', { name: 'Save survey' }).click()
  await page.getByRole('button', { name: 'Add question' }).click()
  await page.getByRole('textbox', { name: 'Question' }).fill('Did the docs help?')
  await page.getByRole('button', { name: 'Add' }).click()
  await page.getByRole('button', { name: 'Start collecting' }).click()
  await page.getByLabel('Did the docs help?').check()
  await page.getByRole('button', { name: 'Submit response' }).click()

  await page.goto('/')
  await expect(page.getByText('Onboarding Pulse')).toBeVisible()
  await expect(page.getByText('Did the docs help?')).toBeVisible()
  await expect(page.getByText('1 response')).toBeVisible()
})
