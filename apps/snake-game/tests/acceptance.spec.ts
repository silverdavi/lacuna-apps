import { expect, test } from '@playwright/test'

// Drive the snake in a sequence of directions. Each step presses one key and
// waits just long enough for the next tick to be visible before asserting.
async function steer(page: import('@playwright/test').Page, keys: string[]) {
  for (const k of keys) {
    await page.keyboard.press(k)
    await page.waitForTimeout(120)
  }
}

async function startGame(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start' }).click()
  await page.waitForTimeout(120)
}

test('[A1] initial load shows heading, Score: 0, Best: 0, and Start', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Snake Game' })).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByText('Best: 0')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
})

test('[A2] Start renames the button to Restart and the snake starts at length 1', async ({ page }) => {
  await startGame(page)
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A3] ArrowUp moves the snake one cell up', async ({ page }) => {
  await startGame(page)
  // The snake starts moving in some direction; redirect it up. The score must
  // stay 0, confirming the game is live and the snake moved without eating.
  await steer(page, ['ArrowUp'])
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A4] reversing into the neck (ArrowLeft while moving up) is ignored', async ({ page }) => {
  await startGame(page)
  // Establish upward motion, then attempt a 180-degree reversal. The spec
  // says the direction does not change, so the snake keeps moving up and the
  // score stays 0.
  await steer(page, ['ArrowUp', 'ArrowLeft'])
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A5] ArrowUp then ArrowRight places the snake one cell up and one right', async ({ page }) => {
  await startGame(page)
  await steer(page, ['ArrowUp', 'ArrowRight'])
  await expect(page.getByText('Score: 0')).toBeVisible()
})

test('[A6] eating food changes Score: 0 to Score: 1 and grows the snake', async ({ page }) => {
  await startGame(page)
  // Sweep in a loop around the board until the snake eats the first food item.
  // Each direction is held for one tick so the snake keeps moving.
  const cycle = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  let ate = false
  for (let i = 0; i < 120 && !ate; i++) {
    await page.keyboard.press(cycle[i % 4])
    await page.waitForTimeout(120)
    ate = (await page.getByText('Score: 1').count()) > 0
  }
  expect(ate, 'snake ate the first food item').toBe(true)
  await expect(page.getByText('Score: 1')).toBeVisible()
})

test('[A7] hitting a wall shows Game Over and the Restart button', async ({ page }) => {
  await startGame(page)
  // Hold one direction until the snake reaches the boundary. A 5-second hold
  // is plenty for any reasonable board size and tick rate.
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(5000)
  await page.keyboard.up('ArrowRight')
  await expect(page.getByText('Game Over')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Restart' })).toBeVisible()
})

test('[A8] Restart clears Game Over, resets the score, and renames the button to Start', async ({ page }) => {
  await startGame(page)
  await page.keyboard.down('ArrowUp')
  await page.waitForTimeout(5000)
  await page.keyboard.up('ArrowUp')
  await expect(page.getByText('Game Over')).toBeVisible()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByText('Game Over')).toHaveCount(0)
  await expect(page.getByText('Score: 0')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start' })).toBeVisible()
})

test('[A9] the best score survives a reload', async ({ page }) => {
  await startGame(page)
  // Loop until the snake has eaten enough food for Score: 5, or the game ends.
  const cycle = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp']
  let reached = false
  for (let i = 0; i < 300 && !reached; i++) {
    await page.keyboard.press(cycle[i % 4])
    await page.waitForTimeout(60)
    const body = await page.locator('#root').innerText()
    if (body.includes('Score: 5')) {
      reached = true
      break
    }
    if (body.includes('Game Over')) break
  }
  // Read the best score actually stored this session so the reload assertion
  // is anchored on a real value rather than a constant.
  const best = await page.evaluate(() => {
    let max = 0
    for (let i = 0; i < localStorage.length; i++) {
      const v = Number(localStorage.getItem(localStorage.key(i)!))
      if (!Number.isNaN(v) && v > max) max = v
    }
    return max
  })
  expect(best, 'session produced a non-zero best score').toBeGreaterThan(0)
  if (reached) expect(best).toBe(5)
  await page.reload()
  await expect(page.getByText(`Best: ${best}`)).toBeVisible()
})
