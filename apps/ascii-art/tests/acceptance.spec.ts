import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import * as path from 'node:path'

function svgPng(width: number, height: number): Buffer {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="black"/></svg>`
  return Buffer.from(svg, 'utf8')
}

async function generateText(page: Page) {
  await page.getByLabel('Input text').fill('Hello')
  await page.getByRole('button', { name: 'Generate' }).click()
}

async function outputLines(page: Page): Promise<string[]> {
  const text = await page.getByLabel('ASCII output').innerText()
  return text.split('\n')
}

async function uploadImage(page: Page, width: number, height: number) {
  const file = path.join('/tmp', `ascii-art-test-${width}x${height}.svg`)
  fs.writeFileSync(file, svgPng(width, height))
  await page.getByLabel('Upload image').setInputFiles(file)
}

test('[A1] heading is shown and the Text tab is selected by default', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'ASCII Art Generator' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Text' })).toHaveAttribute('aria-selected', 'true')
})

test('[A2] generating Hello with the default character set shows "H e l l o"', async ({ page }) => {
  await page.goto('/')
  await generateText(page)
  await expect(page.getByLabel('ASCII output')).toContainText('H e l l o')
})

test('[A3] generating Hello with the Block character set shows a block character', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('Hello')
  await page.getByLabel('Character set').selectOption({ label: 'Block' })
  await page.getByRole('button', { name: 'Generate' }).click()
  const text = await page.getByLabel('ASCII output').innerText()
  expect(text, 'block characters must appear').toMatch(/[▀▄█]/)
})

test('[A4] generating Hello with Width 10 shows exactly 10 characters per line', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('Hello')
  await page.getByLabel('Width').fill('10')
  await page.getByRole('button', { name: 'Generate' }).click()
  const lines = await outputLines(page)
  expect(lines.length).toBeGreaterThan(0)
  for (const line of lines) {
    expect(line.length, 'each line must be exactly 10 characters').toBe(10)
  }
})

test('[A5] Copy copies the ASCII output to the clipboard and shows the message', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await generateText(page)
  const output = await page.getByLabel('ASCII output').innerText()
  await page.getByRole('button', { name: 'Copy' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard, 'clipboard holds the current ASCII output').toBe(output)
})

test('[A6] the Image tab shows the Upload image file input and a Generate button', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Image' }).click()
  await expect(page.getByLabel('Upload image')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Generate' })).toBeVisible()
})

test('[A7] uploading a 100x100 image and generating with Width 50 shows 50 characters per line', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Image' }).click()
  await uploadImage(page, 100, 100)
  await page.getByLabel('Width').fill('50')
  await page.getByRole('button', { name: 'Generate' }).click()
  const lines = await outputLines(page)
  expect(lines.length).toBeGreaterThan(0)
  for (const line of lines) {
    expect(line.length, 'each line must be exactly 50 characters').toBe(50)
  }
})

test('[A8] Download saves a file named ascii-art.txt containing the current output', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('tab', { name: 'Image' }).click()
  await uploadImage(page, 100, 100)
  await page.getByRole('button', { name: 'Generate' }).click()
  const output = await page.getByLabel('ASCII output').innerText()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('ascii-art.txt')
  const saved = path.join('/tmp', `ascii-art-download-${Date.now()}.txt`)
  await download.saveAs(saved)
  const content = fs.readFileSync(saved, 'utf8')
  fs.unlinkSync(saved)
  expect(content, 'downloaded file holds the current ASCII output').toBe(output)
})

test('[A9] reload keeps the last generated ASCII art', async ({ page }) => {
  await page.goto('/')
  await generateText(page)
  await page.reload()
  await expect(page.getByLabel('ASCII output')).toContainText('H e l l o')
})
