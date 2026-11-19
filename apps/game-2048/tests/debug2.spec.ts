import { test } from '@playwright/test'

const KEY = 'lacuna.game-2048.game-state.v1'
const read = async (page: import('@playwright/test').Page) =>
  page.evaluate((k) => {
    try {
      return localStorage.getItem(k)
    } catch (e) {
      return 'ERR:' + String(e)
    }
  }, KEY)

test('dbg A: make a move', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(300)
  console.log('A origin:', page.evaluate(() => location.origin))
  console.log('A before moves:', await read(page))
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('ArrowRight')
    await page.waitForTimeout(150)
  }
  console.log('A after moves:', await read(page))
})

test('dbg B: check storage on next test', async ({ page }) => {
  await page.goto('/')
  await page.waitForTimeout(300)
  console.log('B origin:', page.evaluate(() => location.origin))
  console.log('B storage:', await read(page))
  const score = await page.evaluate(() => document.querySelector('#root')?.innerText.match(/Score: \d+/)?.[0])
  console.log('B score:', score)
})
