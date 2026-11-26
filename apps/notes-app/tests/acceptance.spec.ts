import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'

async function saveNote(page: Page, title: string, content: string) {
  await page.getByLabel('Title').fill(title)
  await page.getByLabel('Content').fill(content)
  await page.getByRole('button', { name: 'Save note' }).click()
}

function note(page: Page, text: string) {
  return page.getByRole('listitem').filter({ hasText: text })
}

test('[A1] empty app shows the heading and "No notes yet"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Quick Notes' })).toBeVisible()
  await expect(page.getByText('No notes yet')).toBeVisible()
})

test('[A2] saving a note adds a list item with the title and content', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Meeting', 'Discuss Q3 roadmap')
  const item = note(page, 'Meeting')
  await expect(item).toBeVisible()
  await expect(item).toContainText('Discuss Q3 roadmap')
  await expect(page.getByText('No notes yet')).toHaveCount(0)
})

test('[A3] saving a second note adds a second list item', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Meeting', 'Discuss Q3 roadmap')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  await expect(note(page, 'Grocery list')).toContainText('Milk, eggs, bread')
  await expect(page.getByRole('listitem')).toHaveCount(2)
})

test('[A4] typing "Meet" in Search shows only the Meeting note', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Meeting', 'Discuss Q3 roadmap')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  await page.getByLabel('Search').fill('Meet')
  await expect(note(page, 'Meeting')).toBeVisible()
  await expect(note(page, 'Grocery list')).toHaveCount(0)
})

test('[A5] Delete Meeting removes the Meeting note and keeps Grocery list', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Meeting', 'Discuss Q3 roadmap')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  await page.getByRole('button', { name: 'Delete Meeting' }).click()
  await expect(note(page, 'Meeting')).toHaveCount(0)
  await expect(note(page, 'Grocery list')).toBeVisible()
})

test('[A6] Export JSON downloads quick-notes.json containing the note content', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Export JSON' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('quick-notes.json')
  const body = readFileSync((await download.path())!, 'utf8')
  expect(body).toContain('Grocery list')
})

test('[A7] the All tab shows both notes and the Archived tab shows "No notes yet"', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Meeting', 'Discuss Q3 roadmap')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  await page.getByRole('tab', { name: 'All' }).click()
  await expect(note(page, 'Meeting')).toBeVisible()
  await expect(note(page, 'Grocery list')).toBeVisible()
  await page.getByRole('tab', { name: 'Archived' }).click()
  await expect(page.getByText('No notes yet')).toBeVisible()
})

test('[A8] typing "Milk" and pressing Enter shows only the Grocery list note', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Meeting', 'Discuss Q3 roadmap')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  await page.getByLabel('Search').fill('Milk')
  await page.getByLabel('Search').press('Enter')
  await expect(note(page, 'Grocery list')).toBeVisible()
  await expect(note(page, 'Meeting')).toHaveCount(0)
})

test('[A9] a reload keeps the Grocery list note', async ({ page }) => {
  await page.goto('/')
  await saveNote(page, 'Grocery list', 'Milk, eggs, bread')
  await page.reload()
  const item = note(page, 'Grocery list')
  await expect(item).toBeVisible()
  await expect(item).toContainText('Milk, eggs, bread')
})
