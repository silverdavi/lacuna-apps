import { expect, test } from '@playwright/test'

const stringSchema = '{"type": "object", "properties": {"name": {"type": "string"}}}'

test('[A1] empty app shows heading, Validate button, and the no-results text', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'JSON Schema Validator' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Validate' })).toBeVisible()
  await expect(page.getByText('No validation results yet')).toBeVisible()
})

test('[A2] valid data and schema show Validation passed and hide the no-results text', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"name": "Alice"}')
  await page.getByLabel('Schema').fill(stringSchema)
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation passed')).toBeVisible()
  await expect(page.getByText('No validation results yet')).toBeHidden()
})

test('[A3] wrong type reports the type error in the results list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"name": 123}')
  await page.getByLabel('Schema').fill(stringSchema)
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation failed')).toBeVisible()
  await expect(page.getByRole('listitem')).toContainText('name: expected string, got number')
})

test('[A4] missing required field reports it in the results list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"age": 25}')
  await page.getByLabel('Schema').fill('{"type": "object", "required": ["name"]}')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation failed')).toBeVisible()
  await expect(page.getByRole('listitem')).toContainText('name: required field missing')
})

test('[A5] string not matching the pattern reports it in the results list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"code": "ABC123"}')
  await page.getByLabel('Schema').fill(
    '{"type": "object", "properties": {"code": {"type": "string", "pattern": "^[A-Z]{3}$"}}}',
  )
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation failed')).toBeVisible()
  await expect(page.getByRole('listitem')).toContainText('code: does not match pattern ^[A-Z]{3}$')
})

test('[A6] number above the maximum reports it in the results list', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"value": 150}')
  await page.getByLabel('Schema').fill(
    '{"type": "object", "properties": {"value": {"type": "number", "minimum": 100, "maximum": 100}}}',
  )
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation failed')).toBeVisible()
  await expect(page.getByRole('listitem')).toContainText('value: 150 is greater than maximum 100')
})

test('[A7] invalid JSON in the data field reports the parse error', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('not json')
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Invalid JSON in data field')).toBeVisible()
  await expect(page.getByText('Validation passed')).toBeHidden()
  await expect(page.getByText('Validation failed')).toBeHidden()
})

test('[A8] Download Report after a pass downloads validation-report.json with a pass status', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"name": "Alice"}')
  await page.getByLabel('Schema').fill(stringSchema)
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation passed')).toBeVisible()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Download Report' }).click(),
  ])
  expect(download.suggestedFilename()).toBe('validation-report.json')
  const path = await download.path()
  const { readFileSync } = await import('node:fs')
  // The spec's `"status":"pass"` is read as the report's status being "pass";
  // parsed rather than raw, so whitespace formatting cannot change the outcome.
  expect(JSON.parse(readFileSync(path, 'utf8')).status).toBe('pass')
})

test('[A9] the last validation result and both textareas survive a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('JSON Data').fill('{"name": "Alice"}')
  await page.getByLabel('Schema').fill(stringSchema)
  await page.getByRole('button', { name: 'Validate' }).click()
  await expect(page.getByText('Validation passed')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Validation passed')).toBeVisible()
  await expect(page.getByLabel('JSON Data')).toHaveValue('{"name": "Alice"}')
  await expect(page.getByLabel('Schema')).toHaveValue(stringSchema)
})
