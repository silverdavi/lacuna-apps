import { readFile } from 'fs/promises'
import { expect, test } from '@playwright/test'

test('[A1] page shows the heading "Resume Builder" and the "Edit" and "Preview" tab buttons', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Resume Builder' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Preview' })).toBeVisible()
})

test('[A2] entering a name and email updates the form; "Add experience" adds an entry', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Full Name').fill('Jane Doe')
  await page.getByLabel('Email').fill('jane@example.com')
  await page.getByRole('button', { name: 'Add experience' }).click()
  await expect(page.getByLabel('Full Name')).toHaveValue('Jane Doe')
  await expect(page.getByLabel('Email')).toHaveValue('jane@example.com')
  await expect(page.getByRole('button', { name: 'Add experience' })).toBeVisible()
})

test('[A3] a saved experience shows its title and company in the preview', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Job Title').fill('Software Engineer')
  await page.getByLabel('Company').fill('Acme Corp')
  await page.getByLabel('Start Year').fill('2020')
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByText('Software Engineer')).toBeVisible()
  await expect(page.getByText('Acme Corp')).toBeVisible()
})

test('[A4] summary lines render as a bulleted list in the preview', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Summary').fill('- Led team of 5\n- Built API')
  await page.getByRole('tab', { name: 'Preview' }).click()
  const list = page.locator('li')
  await expect(list).toHaveCount(2)
  await expect(list.nth(0)).toHaveText('Led team of 5')
  await expect(list.nth(1)).toHaveText('Built API')
})

test('[A5] "Export Markdown" downloads resume.md containing the entered content', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Full Name').fill('Jane Doe')
  await page.getByRole('button', { name: 'Add experience' }).click()
  await page.getByLabel('Job Title').fill('Software Engineer')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Markdown' }).click()
  const download = await downloadPromise
  await download.saveAs('/tmp/resume.md')
  expect(download.suggestedFilename()).toBe('resume.md')
  const content = await readFile('/tmp/resume.md', 'utf8')
  expect(content).toContain('Jane Doe')
  expect(content).toContain('Software Engineer')
})

test('[A6] the skills field shows its text in the preview', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Skills').fill('JavaScript, Python')
  await page.getByRole('tab', { name: 'Preview' }).click()
  const skills = page.locator('li', { hasText: 'JavaScript, Python' })
  await expect(skills).toBeVisible()
})

test('[A7] "Delete experience" removes an entry from the preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add experience' }).click()
  await page.getByLabel('Job Title').fill('Software Engineer')
  await page.getByRole('button', { name: 'Delete experience' }).first().click()
  await page.getByRole('tab', { name: 'Preview' }).click()
  await expect(page.getByText('Software Engineer')).toHaveCount(0)
})

test('[A8] entered details persist across a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Full Name').fill('Jane Doe')
  await page.getByLabel('Email').fill('jane@example.com')
  await page.reload()
  await expect(page.getByLabel('Full Name')).toHaveValue('Jane Doe')
  await expect(page.getByLabel('Email')).toHaveValue('jane@example.com')
})
