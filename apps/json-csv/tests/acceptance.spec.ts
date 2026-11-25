import { expect, test } from '@playwright/test'

import { readFileSync } from 'node:fs'

test('[A1] the page heading is "JSON CSV Converter"', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'JSON CSV Converter' })).toBeVisible()
})

test('[A2] typing JSON and clicking Convert to CSV shows name,age and Alice,30', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Convert to CSV' }).click()
  const output = page.getByRole('textbox').last()
  await expect(output).toHaveValue('name,age\nAlice,30')
})

test('[A3] typing CSV and clicking Convert to JSON shows {"name":"Alice","age":30}', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('name,age\nAlice,30')
  await page.getByRole('button', { name: 'Convert to JSON' }).click()
  const output = page.getByRole('textbox').last()
  await expect(output).toHaveValue('{"name":"Alice","age":30}')
})

test('[A4] clicking Copy output after a JSON to CSV conversion places the CSV on the clipboard', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByRole('textbox').first().fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Convert to CSV' }).click()
  await page.getByRole('button', { name: 'Copy output' }).click()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the converted CSV').toBe('name,age\nAlice,30')
})

test('[A5] clicking Download after a JSON to CSV conversion saves output.csv', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Convert to CSV' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('output.csv')
  const content = readFileSync(await download.path(), 'utf8')
  expect(content, 'file contains the header line').toContain('name,age')
  expect(content, 'file contains the data row').toContain('Alice,30')
})

test('[A6] Semicolon delimiter converts JSON to name;age and Alice;30', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('{"name":"Alice","age":30}')
  await page.getByLabel('Delimiter').selectOption({ label: 'Semicolon' })
  await page.getByRole('button', { name: 'Convert to CSV' }).click()
  const output = page.getByRole('textbox').last()
  await expect(output).toHaveValue('name;age\nAlice;30')
})

test('[A7] the history lists JSON to CSV and Clear history empties it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('{"name":"Alice","age":30}')
  await page.getByRole('button', { name: 'Convert to CSV' }).click()
  await expect(page.getByText('JSON to CSV')).toBeVisible()
  await page.getByRole('button', { name: 'Clear history' }).click()
  await expect(page.getByText('JSON to CSV')).toHaveCount(0)
})

test('[A8] Convert to JSON then Swap moves the JSON to the input and the CSV to the output', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('name,age\nAlice,30')
  await page.getByRole('button', { name: 'Convert to JSON' }).click()
  await page.getByRole('button', { name: 'Swap' }).click()
  await expect(page.getByRole('textbox').first()).toHaveValue('{"name":"Alice","age":30}')
  await expect(page.getByRole('textbox').last()).toHaveValue('name,age\nAlice,30')
})

test('[A9] reload keeps the JSON to CSV history entry and the Semicolon delimiter', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('textbox').first().fill('{"name":"Alice","age":30}')
  await page.getByLabel('Delimiter').selectOption({ label: 'Semicolon' })
  await page.getByRole('button', { name: 'Convert to CSV' }).click()
  await page.reload()
  await expect(page.getByText('JSON to CSV')).toBeVisible()
  await expect(page.getByLabel('Delimiter')).toHaveValue('Semicolon')
})
