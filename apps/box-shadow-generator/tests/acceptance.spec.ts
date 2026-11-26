import { expect, test, type Page } from '@playwright/test'

// The code area is a text region showing the generated CSS (e.g. a <code>/<pre> block);
// it is not itself an interactive control.
const codeArea = (page: Page) =>
  page.locator('code, pre').filter({ hasText: /^box-shadow:/ }).first()

async function goto(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
}

test('[A1] shows the "Box Shadow Generator" heading', async ({ page }) => {
  await goto(page)
  await expect(page.getByRole('heading', { name: 'Box Shadow Generator' })).toBeVisible()
})

test('[A2] default settings generate the spec CSS', async ({ page }) => {
  await goto(page)
  await expect(codeArea(page)).toHaveText('box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 1);')
})

test('[A3] X and Y offsets update the CSS', async ({ page }) => {
  await goto(page)
  await page.getByLabel('X offset').fill('10')
  await page.getByLabel('Y offset').fill('20')
  await expect(codeArea(page)).toHaveText('box-shadow: 10px 20px 12px 0px rgba(0, 0, 0, 1);')
})

test('[A4] blur and spread update the CSS', async ({ page }) => {
  await goto(page)
  await page.getByLabel('X offset').fill('10')
  await page.getByLabel('Y offset').fill('20')
  await page.getByLabel('Blur').fill('5')
  await page.getByLabel('Spread').fill('3')
  await expect(codeArea(page)).toHaveText('box-shadow: 10px 20px 5px 3px rgba(0, 0, 0, 1);')
})

test('[A5] Copy CSS shows a "CSS copied to clipboard" toast', async ({ page }) => {
  await goto(page)
  await page.getByRole('button', { name: 'Copy CSS' }).click()
  await expect(page.getByText('CSS copied to clipboard')).toBeVisible()
})

test('[A6] opacity 50 sets alpha to 0.5 in the CSS', async ({ page }) => {
  await goto(page)
  await page.getByLabel('X offset').fill('10')
  await page.getByLabel('Y offset').fill('20')
  await page.getByLabel('Blur').fill('5')
  await page.getByLabel('Spread').fill('3')
  await page.getByLabel('Opacity').fill('50')
  await expect(codeArea(page)).toHaveText('box-shadow: 10px 20px 5px 3px rgba(0, 0, 0, 0.5);')
})

test('[A7] hex input "ff0000" sets the shadow color to red in the CSS', async ({ page }) => {
  await goto(page)
  await page.getByLabel('X offset').fill('10')
  await page.getByLabel('Y offset').fill('20')
  await page.getByLabel('Blur').fill('5')
  await page.getByLabel('Spread').fill('3')
  await page.getByLabel('Opacity').fill('50')
  await page.getByLabel(/hex/i).fill('ff0000')
  await expect(codeArea(page)).toHaveText('box-shadow: 10px 20px 5px 3px rgba(255, 0, 0, 0.5);')
})

test('[A8] Reset restores the default CSS', async ({ page }) => {
  await goto(page)
  await page.getByLabel('X offset').fill('10')
  await page.getByLabel('Y offset').fill('20')
  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(codeArea(page)).toHaveText('box-shadow: 0px 4px 12px 0px rgba(0, 0, 0, 1);')
})

test('[A9] reload keeps the last saved shadow settings', async ({ page }) => {
  await goto(page)
  await page.getByLabel('X offset').fill('10')
  await expect(codeArea(page)).toHaveText('box-shadow: 10px 4px 12px 0px rgba(0, 0, 0, 1);')
  await page.reload()
  await page.waitForLoadState('networkidle')
  await expect(page.getByLabel('X offset')).toHaveValue('10')
  await expect(codeArea(page)).toHaveText('box-shadow: 10px 4px 12px 0px rgba(0, 0, 0, 1);')
})
