import { expect, test } from '@playwright/test'

test('[A1] with no input, shows heading and intro text and Generate is disabled', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'QR Maker' })).toBeVisible()
  await expect(page.getByText('Enter text or a URL to generate a QR code')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate' })).toBeDisabled()
})

test('[A2] typing Hello and generating shows an SVG for Hello with Error correction: L', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('Hello')
  await expect(page.getByRole('button', { name: 'Generate' })).toBeEnabled()
  await page.getByRole('button', { name: 'Generate' }).click()
  const svg = page.getByRole('img', { name: 'QR code for Hello' })
  await expect(svg).toBeVisible()
  await expect(svg.locator('svg')).toHaveCount(1)
  await expect(page.getByText('Error correction: L')).toBeVisible()
})

test('[A3] generating a URL at correction level H shows an SVG for the URL with Error correction: H', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('https://example.com')
  await page.getByLabel('Error correction').selectOption('H')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('img', { name: 'QR code for https://example.com' })).toBeVisible()
  await expect(page.getByText('Error correction: H')).toBeVisible()
})

test('[A4] Copy shows the tooltip Copied for 2 seconds then returns to Copy', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('Hello')
  await page.getByRole('button', { name: 'Generate' }).click()
  const copy = page.getByRole('button', { name: 'Copy' })
  const start = Date.now()
  await copy.click()
  await expect(page.getByText('Copied')).toBeVisible()
  await expect(page.getByText('Copied')).toBeHidden()
  const elapsed = Date.now() - start
  // The spec fixes the tooltip lifetime at 2 seconds; the wait-for-visibility
  // round trips add slack, so cap the total well below an indefinite hang.
  expect(elapsed).toBeGreaterThanOrEqual(2000)
  expect(elapsed).toBeLessThan(3500)
  await expect(copy).toBeVisible()
  await expect(copy).toHaveText('Copy')
})

test('[A5] Download triggers a file named qr-hello.svg containing valid SVG markup', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('Hello')
  await page.getByRole('button', { name: 'Generate' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('qr-hello.svg')
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  const svg = readFileSync(path, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).toContain('</svg>')
})

test('[A6] generating an empty content shows the message and renders no SVG', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByText('Content cannot be empty')).toBeVisible()
  await expect(page.locator('svg')).toHaveCount(0)
})

test('[A7] regenerating after switching correction to Q shows Error correction: Q', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('Test')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.getByLabel('Error correction').selectOption('Q')
  await page.getByRole('button', { name: 'Generate' }).click()
  await expect(page.getByRole('img', { name: 'QR code for Test' })).toBeVisible()
  await expect(page.getByText('Error correction: Q')).toBeVisible()
})

test('[A8] the last generated code and its settings survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Content').fill('Persist')
  await page.getByRole('button', { name: 'Generate' }).click()
  await page.reload()
  await expect(page.getByLabel('Content')).toHaveValue('Persist')
  await expect(page.getByRole('img', { name: 'QR code for Persist' })).toBeVisible()
})
