import { expect, test } from '@playwright/test'

test('[A1] page shows the heading "Cipher Tool" and the text "Enter text to transform"', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Cipher Tool' })).toBeVisible()
  await expect(page.getByText('Enter text to transform')).toBeVisible()
})

test('[A2] encoding "hello world" with Base64 shows "aGVsbG8gd29ybGQ="', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello world')
  await page.getByLabel('Cipher').selectOption({ label: 'Base64' })
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('aGVsbG8gd29ybGQ=')
})

test('[A3] decoding "aGVsbG8gd29ybGQ=" with Base64 shows "hello world"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('aGVsbG8gd29ybGQ=')
  await page.getByLabel('Cipher').selectOption({ label: 'Base64' })
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('hello world')
})

test('[A4] encoding "42" with Hex shows "2a"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('42')
  await page.getByLabel('Cipher').selectOption({ label: 'Hex' })
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('2a')
})

test('[A5] decoding "2a" with Hex shows "42"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('2a')
  await page.getByLabel('Cipher').selectOption({ label: 'Hex' })
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('42')
})

test('[A6] encoding "HELLO" with Caesar shift 3 shows "KHOOR"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('HELLO')
  await page.getByLabel('Cipher').selectOption({ label: 'Caesar' })
  await page.getByLabel('Shift').fill('3')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('KHOOR')
})

test('[A7] Copy result after a Base64 transform shows the message and puts the result on the clipboard', async ({
  page,
  context,
}) => {
  // the user action that copies must happen after the clipboard permission is granted
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello world')
  await page.getByLabel('Cipher').selectOption({ label: 'Base64' })
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('aGVsbG8gd29ybGQ=')
  await page.getByRole('button', { name: 'Copy result' }).click()
  await expect(page.getByText('Copied to clipboard')).toBeVisible()
  // read the clipboard after the user action; no page or storage mutation
  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text, 'clipboard holds the transformed result').toBe('aGVsbG8gd29ybGQ=')
})

test('[A8] encoding "hello world" with URL shows "hello%20world"', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Cipher').selectOption({ label: 'URL' })
  await page.getByLabel('Input text').fill('hello world')
  await page.getByRole('button', { name: 'Transform' }).click()
  await expect(page.getByLabel('Result')).toHaveValue('hello%20world')
})

test('[A9] reload keeps the last input "hello world" and the cipher selection "Base64"', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByLabel('Input text').fill('hello world')
  await page.getByLabel('Cipher').selectOption({ label: 'Base64' })
  await page.reload()
  await expect(page.getByLabel('Input text')).toHaveValue('hello world')
  await expect(page.getByLabel('Cipher')).toHaveValue('Base64')
})
