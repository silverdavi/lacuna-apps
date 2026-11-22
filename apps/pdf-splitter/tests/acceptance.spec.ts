import { test, expect } from '@playwright/test'

test('[A1] heading displays "PDF Splitter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'PDF Splitter' })).toBeVisible()
})

test('[A2] dropping report.pdf shows preview card with name and page count', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await expect(page.getByText('report.pdf')).toBeVisible()
  await expect(page.getByText('3 pages')).toBeVisible()
})

test('[A3] split with page range 1-2 shows success and enables download', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Page range').fill('1-2')
  await page.getByRole('button', { name: 'Process' }).click()
  await expect(page.getByText('Split complete')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
})

test('[A4] download after split triggers report_split.pdf', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Page range').fill('1-2')
  const [download] = await Promise.all([
    page.getByRole('button', { name: 'Process' }).click().then(() =>
      page.waitForEvent('download'),
    ),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('report_split.pdf')
})

test('[A5] merge with second file shows success and enables download', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await page.getByRole('tab', { name: 'Merge' }).click()
  await dropZone.setInputFiles([
    {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    },
    {
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content 2'),
    },
  ])
  await page.getByRole('button', { name: 'Process' }).click()
  await expect(page.getByText('Merge complete')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download PDF' })).toBeEnabled()
})

test('[A6] download after merge triggers merged.pdf', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles([
    {
      name: 'report.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content'),
    },
    {
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake pdf content 2'),
    },
  ])
  await page.getByRole('tab', { name: 'Merge' }).click()
  const [download] = await Promise.all([
    page.getByRole('button', { name: 'Process' }).click().then(() =>
      page.waitForEvent('download'),
    ),
    page.getByRole('button', { name: 'Download PDF' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('merged.pdf')
})

test('[A7] history shows processed file entry', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Page range').fill('1-2')
  await page.getByRole('button', { name: 'Process' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('report.pdf')).toBeVisible()
  await expect(page.getByText('Split')).toBeVisible()
})

test('[A8] clear history removes all items', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Page range').fill('1-2')
  await page.getByRole('button', { name: 'Process' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('report.pdf')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('report.pdf')).toHaveCount(0)
})

test('[A9] history persists across reload', async ({ page }) => {
  await page.goto('/')
  const dropZone = page.getByText('Drop PDF here')
  await dropZone.setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake pdf content'),
  })
  await page.getByRole('tab', { name: 'Split' }).click()
  await page.getByLabel('Page range').fill('1-2')
  await page.getByRole('button', { name: 'Process' }).click()
  await page.reload()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('report.pdf')).toBeVisible()
  await expect(page.getByText('Split')).toBeVisible()
})
