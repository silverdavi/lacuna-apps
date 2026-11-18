import { expect, test } from '@playwright/test'

test('non-numeric input shows an inline message and no NaN', async ({ page }) => {
  await page.goto('/')
  const meters = page.getByLabel('Value in Meters')
  await meters.fill('abc')
  await page.getByRole('button', { name: 'Convert' }).click()

  await expect(page.getByText('Type a number, like 2.5')).toBeVisible()
  await expect(page.getByLabel('Value in Feet')).toHaveValue('')
  const rootText = await page.locator('#root').innerText()
  expect(rootText).not.toContain('NaN')
})
