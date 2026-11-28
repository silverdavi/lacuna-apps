import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test('[A1] Loads API Request Flow template with nodes and Mermaid output', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Diagram Studio' })).toBeVisible()
  await expect(page.locator('[data-node="N1"]')).toContainText('Client App')
  await expect(page.locator('[data-node="N5"]')).toContainText('Primary Store')
  await expect(page.getByLabel('Mermaid source')).toContainText('N1 -->|HTTPS| N2')
})

test('[A2] Adding a node and connector updates diagram, Mermaid, and persists across reload', async ({ page }) => {
  await page.getByLabel('New node label').fill('Redis Cache')
  await page.getByLabel('New node shape').selectOption('database')
  await page.getByRole('button', { name: 'Add node' }).click()

  await expect(page.locator('[data-node="N6"]')).toContainText('Redis Cache')
  await expect(page.getByLabel('Mermaid source')).toContainText('N6[("Redis Cache")]')

  await page.getByLabel('From node').selectOption('N3')
  await page.getByLabel('To node').selectOption('N6')
  await page.getByLabel('New connector label').fill('lookup')
  await page.getByRole('button', { name: 'Add connector' }).click()
  await expect(page.getByLabel('Mermaid source')).toContainText('N3 -->|lookup| N6')

  await page.reload()
  await expect(page.locator('[data-node="N6"]')).toContainText('Redis Cache')
})

test('[A3] Importing Mermaid syntax builds a new diagram and supports Undo', async ({ page }) => {
  await page.getByLabel('Mermaid source').fill('flowchart TD\n  A(["Start"]) --> B{"Ready?"}\n  B -->|Yes| C["Ship"]')
  await page.getByRole('button', { name: 'Import Mermaid' }).click()

  await expect(page.locator('[data-node="A"]')).toContainText('Start')
  await expect(page.locator('[data-node="C"]')).toContainText('Ship')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('[data-node="N1"]')).toContainText('Client App')
})

test('[A4] Export SVG and Mermaid trigger downloads', async ({ page }) => {
  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export SVG' }).click()
  expect((await svgDownload).suggestedFilename()).toBe('diagram.svg')

  const mmdDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export Mermaid' }).click()
  expect((await mmdDownload).suggestedFilename()).toBe('diagram.mmd')
})
