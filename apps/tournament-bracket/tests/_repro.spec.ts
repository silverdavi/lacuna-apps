import { test } from '@playwright/test'

async function setup(page: any) {
  await page.goto('/')
  await page.waitForTimeout(400)
  await page.getByRole('tab', { name: 'Players' }).click()
  await page.getByLabel('Player name').fill('Alice')
}

async function boxOf(page: any) {
  const box = await page.getByRole('button', { name: 'Add player' }).boundingBox()
  return { cx: box.x + box.width / 2, cy: box.y + box.height / 2 }
}

test('x0 move then down then up', async ({ page }) => {
  page.on('crash', () => console.log('CRASH'))
  await setup(page)
  const { cx, cy } = await boxOf(page)
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.waitForTimeout(100)
  try {
    await page.mouse.up()
    console.log('x0: UP OK')
  } catch {
    console.log('x0: DIED at up')
  }
  if (!page.isClosed()) console.log('x0 alive, body:', (await page.evaluate(() => document.body.innerText.slice(0, 80))).replace(/\n/g, ' | '))
})

test('x1 down up then move', async ({ page }) => {
  page.on('crash', () => console.log('CRASH'))
  await setup(page)
  const { cx, cy } = await boxOf(page)
  await page.mouse.down({ x: cx, y: cy })
  await page.mouse.up({ x: cx, y: cy })
  console.log('x1: down/up done, closed:', page.isClosed())
  if (!page.isClosed()) {
    await page.mouse.move(cx + 5, cy + 5)
    await page.waitForTimeout(200)
    console.log('x1: after extra move, closed:', page.isClosed())
  }
})

test('x2 move away then back then click', async ({ page }) => {
  page.on('crash', () => console.log('CRASH'))
  await setup(page)
  const { cx, cy } = await boxOf(page)
  await page.mouse.move(cx - 50, cy - 40)
  await page.waitForTimeout(150)
  await page.mouse.move(cx, cy)
  await page.waitForTimeout(150)
  await page.mouse.down()
  await page.waitForTimeout(100)
  try {
    await page.mouse.up()
    console.log('x2: UP OK')
  } catch {
    console.log('x2: DIED at up')
  }
  if (!page.isClosed()) console.log('x2 alive')
})
