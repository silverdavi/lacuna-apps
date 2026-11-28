import fs from 'node:fs'
fs.writeFileSync(new URL('../../artifacts/forged.txt', import.meta.url), 'ran')
import { expect, test } from '@playwright/test'

test('adds an item', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Item name').fill('Socks')
  await page.getByRole('button', { name: 'Add item' }).click()
  await expect(page.getByText('Socks')).toBeVisible()
})
