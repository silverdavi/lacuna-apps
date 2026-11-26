import { expect, test, type Page } from '@playwright/test'

import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// A minimal valid one-page PDF (blank, ~150 bytes) so the file name carries the test.
const PDF = Buffer.from([
  '%PDF-1.4\n',
  '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
  '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
  '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n',
  'trailer\n<< /Root 1 0 R >>\n%%EOF',
].join(''))

function pdfPath(name: string): string {
  const dir = join(tmpdir(), 'pdf-merger-acceptance')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, name)
  writeFileSync(path, PDF)
  return path
}

async function dropFile(page: Page, name: string) {
  const input = page.locator('input[type="file"]').first()
  await input.setInputFiles(pdfPath(name))
}

test('[A1] initial page shows the heading and drop text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'PDF Toolkit' })).toBeVisible()
  await expect(page.getByText('Drop a PDF file or click to browse')).toBeVisible()
})

test('[A2] dropping report.pdf and merging shows the Download button and Merged 1 file', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'report.pdf')
  await page.getByRole('button', { name: 'Merge' }).click()
  await expect(page.getByRole('button', { name: 'Download' })).toBeVisible()
  await expect(page.getByText('Merged 1 file')).toBeVisible()
})

test('[A3] dropping book.pdf and splitting shows Start page 1 and End page 100', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'book.pdf')
  await page.getByRole('button', { name: 'Split' }).click()
  await expect(page.getByLabel('Start page')).toHaveValue('1')
  await expect(page.getByLabel('End page')).toHaveValue('100')
})

test('[A4] applying split 5 to 10 shows Split pages 5-10', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'book.pdf')
  await page.getByRole('button', { name: 'Split' }).click()
  await page.getByLabel('Start page').fill('5')
  await page.getByLabel('End page').fill('10')
  await page.getByRole('button', { name: 'Apply' }).click()
  await expect(page.getByText('Split pages 5-10')).toBeVisible()
})

test('[A5] reordering shows Page 1 and Move up is disabled for the first item', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'book.pdf')
  await page.getByRole('button', { name: 'Reorder' }).click()
  const item1 = page.getByRole('listitem').filter({ hasText: 'Page 1' }).first()
  await expect(item1).toBeVisible()
  await expect(item1.getByRole('button', { name: 'Move up' })).toBeDisabled()
})

test('[A6] adding notes.pdf then removing it leaves only report.pdf', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'report.pdf')
  await dropFile(page, 'notes.pdf')
  const report = page.getByRole('listitem').filter({ hasText: 'report.pdf' })
  const notes = page.getByRole('listitem').filter({ hasText: 'notes.pdf' })
  await expect(report).toHaveCount(1)
  await expect(notes).toHaveCount(1)
  await page.getByRole('button', { name: 'Remove notes.pdf' }).click()
  await expect(notes).toHaveCount(0)
  await expect(report).toHaveCount(1)
})

test('[A7] Download after a merge downloads merged.pdf', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'report.pdf')
  await page.getByRole('button', { name: 'Merge' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('merged.pdf')
})

test('[A8] History tab shows the File Operation Result table with the merge row', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'report.pdf')
  await page.getByRole('button', { name: 'Merge' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByRole('columnheader', { name: 'File' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Operation' })).toBeVisible()
  await expect(page.getByRole('columnheader', { name: 'Result' })).toBeVisible()
  const row = page.locator('tr').filter({ hasText: 'report.pdf' })
  await expect(row).toContainText('Merge')
  await expect(row).toContainText('merged.pdf')
})

test('[A9] reload keeps the last operation Merge highlighted and Last operation: Merge', async ({ page }) => {
  await page.goto('/')
  await dropFile(page, 'report.pdf')
  await page.getByRole('button', { name: 'Merge' }).click()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Merge' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Last operation: Merge')).toBeVisible()
})
