import { expect, test, type Page } from '@playwright/test'

// An experience entry adds duplicate "Job Title" / "Company" / "Start Year" / "Delete experience"
// labels, so .first() targets the first (and only) entry in tests that add a single one.
const firstJobTitle = (page: Page) => page.getByLabel('Job Title', { exact: true }).first()
const firstCompany = (page: Page) => page.getByLabel('Company', { exact: true }).first()
const firstStartYear = (page: Page) => page.getByLabel('Start Year', { exact: true }).first()
const firstDelete = (page: Page) => page.getByRole('button', { name: 'Delete experience', exact: true }).first()

test('[A1] the page displays the heading "Resume Builder" and the tab buttons "Edit" and "Preview"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Resume Builder', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview', exact: true })).toBeVisible()
})

test('[A2] typing "Jane Doe" and "jane@example.com" updates the form state, and "Add experience" adds an empty experience entry', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Full Name', { exact: true }).fill('Jane Doe')
  await page.getByLabel('Email', { exact: true }).fill('jane@example.com')
  await expect(page.getByLabel('Full Name', { exact: true })).toHaveValue('Jane Doe')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('jane@example.com')
  await page.getByRole('button', { name: 'Add experience', exact: true }).click()
  await expect(firstJobTitle(page)).toBeVisible()
  await expect(firstCompany(page)).toBeVisible()
  await expect(firstStartYear(page)).toBeVisible()
})

test('[A3] saving an entry with "Software Engineer", "Acme Corp" and "2020" shows them in the Preview', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add experience', exact: true }).click()
  await firstJobTitle(page).fill('Software Engineer')
  await firstCompany(page).fill('Acme Corp')
  await firstStartYear(page).fill('2020')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByText('Software Engineer', { exact: true })).toBeVisible()
  await expect(page.getByText('Acme Corp', { exact: true })).toBeVisible()
})

test('[A4] the Summary "- Led team of 5\\n- Built API" renders a bulleted list in the Preview', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Summary', { exact: true }).fill('- Led team of 5\n- Built API')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  const list = page.getByRole('list')
  await expect(list.getByRole('listitem', { name: 'Led team of 5' })).toBeVisible()
  await expect(list.getByRole('listitem', { name: 'Built API' })).toBeVisible()
})

test('[A5] "Export Markdown" downloads a file named "resume.md" containing "Jane Doe" and "Software Engineer"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Full Name', { exact: true }).fill('Jane Doe')
  await page.getByRole('button', { name: 'Add experience', exact: true }).click()
  await firstJobTitle(page).fill('Software Engineer')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export Markdown', exact: true }).click(),
  ])
  expect(download.suggestedFilename()).toBe('resume.md')
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const text = readFileSync(path!, 'utf8')
  expect(text).toContain('Jane Doe')
  expect(text).toContain('Software Engineer')
})

test('[A6] "JavaScript, Python" in Skills shows that text in the Preview Skills section', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Skills', { exact: true }).fill('JavaScript, Python')
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByText('JavaScript, Python', { exact: true })).toBeVisible()
})

test('[A7] "Delete experience" on the first entry removes it and the Preview no longer shows "Software Engineer"', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Add experience', exact: true }).click()
  await firstJobTitle(page).fill('Software Engineer')
  await firstCompany(page).fill('Acme Corp')
  await firstStartYear(page).fill('2020')
  await firstDelete(page).click()
  await page.getByRole('button', { name: 'Preview', exact: true }).click()
  await expect(page.getByText('Software Engineer', { exact: true })).toBeHidden()
})

test('[A8] reloading after entering "Jane Doe" and "jane@example.com" keeps both fields populated', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Full Name', { exact: true }).fill('Jane Doe')
  await page.getByLabel('Email', { exact: true }).fill('jane@example.com')
  await page.reload()
  await expect(page.getByLabel('Full Name', { exact: true })).toHaveValue('Jane Doe')
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('jane@example.com')
})
