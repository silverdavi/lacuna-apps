import { expect, test, type Page } from '@playwright/test'

async function createContactUs(page: Page) {
  await page.getByLabel('Form name').fill('Contact Us')
  await page.getByRole('button', { name: 'Create form' }).click()
}

async function buildEmailField(page: Page) {
  await page.getByRole('button', { name: 'Edit' }).click()
  await page.getByLabel('Label').fill('Email')
  await page.getByLabel('Type').selectOption('text')
  await page.getByLabel('Required').check()
  await page.getByRole('button', { name: 'Add field' }).click()
}

test('[A1] heading and empty list state', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dynamic Form Builder' })).toBeVisible()
  await expect(page.getByText('No forms yet')).toBeVisible()
})

test('[A2] creating a form adds it to the list', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await expect(page.getByText('Contact Us')).toBeVisible()
  await expect(page.getByText('No forms yet')).not.toBeVisible()
})

test('[A3] adding a field row in the designer', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await expect(page.getByText('Email')).toBeVisible()
  await expect(page.getByText('text')).toBeVisible()
})

test('[A4] deleting a field row', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await expect(page.getByText('Email')).toBeVisible()
  await page.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByText('Email')).not.toBeVisible()
})

test('[A5] required field blocks submission with error', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Email is required')).toBeVisible()
  await expect(page.getByText('Form submitted successfully')).not.toBeVisible()
})

test('[A6] valid submission shows success', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Form submitted successfully')).toBeVisible()
  await expect(page.getByText('Email is required')).not.toBeVisible()
})

test('[A7] export copies JSON of the response', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await page.getByRole('button', { name: 'Preview' }).click()
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByRole('button', { name: 'Submit' }).click()
  await expect(page.getByText('Form submitted successfully')).toBeVisible()
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Export JSON' }).click()
  const json = await page.evaluate(() => navigator.clipboard.readText())
  expect(json).toContain('"email"')
  expect(json).toContain('test@example.com')
})

test('[A8] saving a form shows field count in the list', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await page.getByRole('button', { name: 'Save form' }).click()
  await expect(page.getByText('Contact Us')).toBeVisible()
  await expect(page.getByText('1 field')).toBeVisible()
})

test('[A9] reload keeps the saved form and its field count', async ({ page }) => {
  await page.goto('/')
  await createContactUs(page)
  await buildEmailField(page)
  await page.getByRole('button', { name: 'Save form' }).click()
  await page.reload()
  await expect(page.getByText('Contact Us')).toBeVisible()
  await expect(page.getByText('1 field')).toBeVisible()
})
