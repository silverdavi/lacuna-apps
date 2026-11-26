import { test, expect } from '@playwright/test'

const INPUT = 'Input JSON'
const OUTPUT = 'Output JSON'

test('[A1] heading is "JSON Formatter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'JSON Formatter' })).toBeVisible()
})

test('[A2] format turns raw JSON into pretty output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Format' }).click()
  await expect(page.getByLabel(OUTPUT)).toHaveValue('{\n "name": "Alice",\n "age": 30\n}')
})

test('[A3] invalid JSON shows the parse error and leaves output empty', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice"')
  await page.getByRole('button', { name: 'Format' }).click()
  await expect(page.getByText('Invalid JSON: Unexpected end of JSON input')).toBeVisible()
  await expect(page.getByLabel(OUTPUT)).toHaveValue('')
})

test('[A4] copy output shows the toast', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Copy Output' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
})

test('[A5] validate passes for valid input', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Validate' }).click()
  await page.getByLabel(INPUT).fill('{"name":"Bob","age":25}')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation passed')).toBeVisible()
})

test('[A6] validate reports type mismatch', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Validate' }).click()
  // [A6] spec wording is malformed; read as the valid JSON it intends.
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":"thirty"}')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('age must be a number')).toBeVisible()
})

test('[A7] history lists previously formatted snippets', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Format' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await expect(page.getByText('{"name":"Alice","age":30}')).toBeVisible()
})

test('[A8] clear history empties the list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Format' }).click()
  await page.getByRole('tab', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Clear History' }).click()
  await expect(page.getByText('No history yet')).toBeVisible()
})

test('[A9] reload restores input and formatted output', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel(INPUT).fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Format' }).click()
  await page.reload()
  await expect(page.getByLabel(INPUT)).toHaveValue('{"name":"Alice","age":30}')
  await expect(page.getByLabel(OUTPUT)).toHaveValue('{\n "name": "Alice",\n "age": 30\n}')
})
