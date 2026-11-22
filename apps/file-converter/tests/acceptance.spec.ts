import { expect, test, type Page } from '@playwright/test'

// The spec talks about dropping files, but the app's drop zone also offers a
// "click to browse" affordance (A1). We load files the same way a person using
// the browse button would: click the drop zone, answer the native file
// chooser. This keeps every test driven by real user actions (click + chooser),
// which the acceptance lint requires.

function dropText(page: Page) {
  return page.getByText('Drop a file or click to browse')
}

// Loads a file named `name` with the given bytes into the app through the
// drop zone's browse affordance.
async function loadFile(page: Page, name: string, bytes: Buffer, mime: string) {
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    dropText(page).click(),
  ])
  await chooser.setFiles({ name, mimeType: mime, buffer: bytes })
}

// Minimal valid single-page PDF, 612x792 points.
const PDF = Buffer.from(
  '%PDF-1.4\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\n' +
    'trailer\n<< /Root 1 0 R /Size 4 >>\n' +
    '%%EOF\n',
)

// Minimal valid 1x1 white JPEG.
const JPG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
    'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
    'AAAAAAAAAAAAAAEA/9oACAEBAAA/AAP/2Q==',
  'base64',
)

async function convert(page: Page, inputName: string, outFormat: string, bytes: Buffer, mime: string) {
  await loadFile(page, inputName, bytes, mime)
  await page.getByLabel('Output format').selectOption({ label: outFormat })
  await page.getByRole('button', { name: 'Convert' }).click()
}

test('[A1] page heading and drop zone text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'File Converter' })).toBeVisible()
  await expect(dropText(page)).toBeVisible()
})

test('[A2] loading report.pdf shows the filename and the output format options', async ({ page }) => {
  await page.goto('/')
  await loadFile(page, 'report.pdf', PDF, 'application/pdf')
  await expect(page.getByText('report.pdf', { exact: true })).toBeVisible()
  const select = page.getByLabel('Output format')
  await expect(select).toBeVisible()
  const options = await select.locator('option').allTextContents()
  expect(options).toContain('PDF')
  expect(options).toContain('PNG')
  expect(options).toContain('JPG')
})

test('[A3] converting report.pdf to PNG shows the status and enables Download', async ({ page }) => {
  await page.goto('/')
  await convert(page, 'report.pdf', 'PNG', PDF, 'application/pdf')
  await expect(page.getByText('Converted report.pdf to report.png')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
})

test('[A4] Download after conversion downloads a file named report.png', async ({ page }) => {
  await page.goto('/')
  await convert(page, 'report.pdf', 'PNG', PDF, 'application/pdf')
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('report.png')
})

test('[A5] history contains report.pdf → report.png after conversion', async ({ page }) => {
  await page.goto('/')
  await convert(page, 'report.pdf', 'PNG', PDF, 'application/pdf')
  await expect(page.getByText('report.pdf → report.png')).toBeVisible()
})

test('[A6] Clear history empties the list and shows No conversions yet', async ({ page }) => {
  await page.goto('/')
  await convert(page, 'report.pdf', 'PNG', PDF, 'application/pdf')
  await expect(page.getByText('report.pdf → report.png')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('report.pdf → report.png')).toHaveCount(0)
  await expect(page.getByText('No conversions yet')).toBeVisible()
})

test('[A7] history item and status survive a reload', async ({ page }) => {
  await page.goto('/')
  await convert(page, 'report.pdf', 'PNG', PDF, 'application/pdf')
  await expect(page.getByText('Converted report.pdf to report.png')).toBeVisible()
  await expect(page.getByText('report.pdf → report.png')).toBeVisible()
  await page.reload()
  await expect(page.getByText('report.pdf → report.png')).toBeVisible()
  await expect(page.getByText('Converted report.pdf to report.png')).toBeVisible()
})

test('[A8] converting photo.jpg to PDF shows the status and adds a history item', async ({ page }) => {
  await page.goto('/')
  await convert(page, 'photo.jpg', 'PDF', JPG, 'image/jpeg')
  await expect(page.getByText('Converted photo.jpg to photo.pdf')).toBeVisible()
  await expect(page.getByText('photo.jpg → photo.pdf')).toBeVisible()
})
